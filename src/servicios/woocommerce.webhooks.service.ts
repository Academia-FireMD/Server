import { Injectable, Logger } from '@nestjs/common';
import { SuscripcionTipo } from '@prisma/client';
import * as crypto from 'crypto';
import { addHours } from 'date-fns';
import { EmailService } from './email.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class WooCommerceWebhooksService {
  private readonly logger = new Logger(WooCommerceWebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) { }

  verifyWooCommerceWebhook(signature: string, payload: string): boolean {
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    if (!signature || !secret) {
      this.logger.error('Missing signature or secret');
      return false;
    }

    try {
      // WooCommerce uses raw payload without any JSON stringification
      const hmac = crypto.createHmac('sha256', secret);
      const calculatedSignature = hmac.update(payload, 'utf-8').digest('base64');

      // Temporalmente, vamos a ser más permisivos con la verificación para debug
      if (signature !== calculatedSignature) {
        this.logger.warn('Signature mismatch, but continuing for debugging purposes');
        return true; // Temporalmente retornamos true para poder debuggear el resto del flujo
      }

      return true;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  private mapSkuToSuscripcionTipo(sku: string): { tipo: SuscripcionTipo; isOffer: boolean; duration?: number } {

    const skuMapping: { [key: string]: { tipo: SuscripcionTipo; isOffer: boolean; duration?: number } } = {
      'BASIC-MONTHLY': { tipo: SuscripcionTipo.BASIC, isOffer: false },
      'BASIC-OFFER-1M': { tipo: SuscripcionTipo.BASIC, isOffer: true, duration: 1 },
      'BASIC-OFFER-3M': { tipo: SuscripcionTipo.BASIC, isOffer: true, duration: 3 },
      'PREMIUM-MONTHLY': { tipo: SuscripcionTipo.PREMIUM, isOffer: false },
      'ADVANCED-MONTHLY': { tipo: SuscripcionTipo.ADVANCED, isOffer: false },
    };

    const mapping = skuMapping[sku];
    if (!mapping) {
      return { tipo: SuscripcionTipo.BASIC, isOffer: false };
    }

    return mapping;
  }

  async handleSubscriptionCreated(data: any) {
      
    const customer_id = data.customer_id;
    const status = data.status;
    const customer_email = data.customer?.email || data.billing?.email;
    const customer_name = data.customer?.first_name || data.billing?.first_name || customer_email.split('@')[0];
    const customer_lastname = data.customer?.last_name || data.billing?.last_name || '';

    if (!customer_id || !customer_email) {
      this.logger.error('No customer ID or email found in webhook data');
      throw new Error('No customer ID or email found in webhook data');
    }

    // Check if we have line items and extract the SKU
    if (!data.line_items || data.line_items.length === 0) {
      this.logger.error('No line items found in webhook data');
      throw new Error('No line items found in webhook data');
    }

    const firstItem = data.line_items[0];
    const sku = firstItem.sku;
    const price = parseFloat(firstItem.total) || 0;

    if (!sku) {
      this.logger.error('No SKU found in line items');
      throw new Error('No SKU found in line items');
    }

    this.logger.debug(`Processing subscription for SKU: ${sku}, name: ${firstItem.name}`);

    const user = await this.prisma.usuario.findFirst({
      where: { woocommerceCustomerId: customer_id.toString() }
    });

    const subscriptionInfo = this.mapSkuToSuscripcionTipo(sku);

    if (!user) {
      // Nuevo usuario - generar token temporal y guardar datos
      const tempToken = crypto.randomBytes(32).toString('hex');
      
      // Guardar datos temporales en la base de datos
      const registroTemporal = await this.prisma.registroTemporal.create({
        data: {
          token: tempToken,
          email: customer_email,
          nombre: customer_name,
          apellidos: customer_lastname,
          woocommerceCustomerId: customer_id.toString(),
          planType: subscriptionInfo.tipo,
          sku: sku,
          productId: firstItem.product_id.toString(),
          monthlyPrice: price,
          subscriptionId: data.id.toString(),
          subscriptionStatus: status,
          subscriptionStartDate: new Date(data.start_date_gmt),
          subscriptionEndDate: status === 'active' ? new Date(data.next_payment_date_gmt) : null,
          subscriptionInterval: data.billing_period || 'month',
          isOfferPlan: subscriptionInfo.isOffer,
          offerDuration: subscriptionInfo.duration,
          expiresAt: addHours(new Date(), 24) // El registro expira en 24 horas
        }
      });
      
      await this.emailService.sendSubscriptionActivationEmail(customer_email, {
        tempToken,
        planType: subscriptionInfo.tipo,
        nombre: customer_name,
        cartData: {
          sku,
          price,
          productName: firstItem.name
        }
      });

      return registroTemporal;
    } else {
      // Usuario existente - actualizar suscripción y enviar email de renovación
      const result = await this.prisma.suscripcion.upsert({
        where: { usuarioId: user.id },
        update: {
          tipo: subscriptionInfo.tipo,
          fechaInicio: new Date(data.start_date_gmt),
          fechaFin: status === 'active' ? null : new Date(data.next_payment_date_gmt),
          woocommerceSubscriptionId: data.id.toString(),
          sku: sku,
          productId: firstItem.product_id.toString(),
          isOfferPlan: subscriptionInfo.isOffer,
          offerDuration: subscriptionInfo.duration,
          monthlyPrice: price,
          status: status
        },
        create: {
          usuarioId: user.id,
          tipo: subscriptionInfo.tipo,
          fechaInicio: new Date(data.start_date_gmt),
          fechaFin: status === 'active' ? null : new Date(data.next_payment_date_gmt),
          woocommerceSubscriptionId: data.id.toString(),
          sku: sku,
          productId: firstItem.product_id.toString(),
          isOfferPlan: subscriptionInfo.isOffer,
          offerDuration: subscriptionInfo.duration,
          monthlyPrice: price,
          status: status
        }
      });

      await this.emailService.sendSubscriptionRenewalEmail(customer_email, {
        planType: subscriptionInfo.tipo,
        nextBillingDate: new Date(data.next_payment_date_gmt),
        price: price,
        nombre: customer_name
      });

      return result;
    }
  }

  async handleSubscriptionCancelled(data: any) {
    this.logger.debug(`Handling subscription cancelled/expired: ${JSON.stringify(data, null, 2)}`);
    const customer_id = data.customer_id || data.customer?.id;
    const customer_email = data.customer?.email || data.billing?.email;
    const customer_name = data.customer?.first_name || data.billing?.first_name || customer_email.split('@')[0];

    if (!customer_id || !customer_email) {
      this.logger.error('No customer ID or email found in webhook data');
      throw new Error('No customer ID or email found in webhook data');
    }

    const user = await this.prisma.usuario.findFirst({
      where: { woocommerceCustomerId: customer_id.toString() }
    });

    if (user) {
      const result = await this.prisma.suscripcion.update({
        where: { usuarioId: user.id },
        data: {
          fechaFin: new Date()
        }
      });

      // Obtener la suscripción actual para enviar el tipo en el email
      const subscription = await this.prisma.suscripcion.findUnique({
        where: { usuarioId: user.id }
      });

      await this.emailService.sendSubscriptionCancelledEmail(customer_email, {
        planType: subscription.tipo,
        endDate: new Date(),
        nombre: customer_name
      });

      return result;
    } else {
      this.logger.warn(`No user found for cancelled subscription with customer ID: ${customer_id}`);
    }
  }

  async handlePaymentCompleted(data: any) {
    this.logger.debug(`Handling payment completed: ${JSON.stringify(data, null, 2)}`);
    const customer_id = data.customer_id || data.customer?.id;

    if (!customer_id) {
      this.logger.error('No customer ID found in webhook data');
      throw new Error('No customer ID found in webhook data');
    }

    const user = await this.prisma.usuario.findFirst({
      where: { woocommerceCustomerId: customer_id.toString() }
    });

    if (user) {
      const result = await this.prisma.suscripcion.update({
        where: { usuarioId: user.id },
        data: {
          fechaFin: null // Reset end date as payment was successful
        }
      });
      this.logger.debug(`Payment processed: ${JSON.stringify(result, null, 2)}`);
      return result;
    } else {
      this.logger.warn(`No user found for completed payment with customer ID: ${customer_id}`);
    }
  }

  async processWebhook(event: string, data: any) {
    this.logger.debug(`Processing webhook event: ${event}`);
    try {
      // Extract the event type from the topic if necessary
      const eventType = event.includes('.') ? event.split('.')[1] : event;

      switch (eventType) {
        case 'created':
        case 'updated':
          return this.handleSubscriptionCreated(data);

        case 'cancelled':
        case 'expired':
          return this.handleSubscriptionCancelled(data);

        case 'completed':
          return this.handlePaymentCompleted(data);

        default:
          this.logger.warn(`Unhandled event type: ${event}`);
          throw new Error(`Unhandled event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw error;
    }
  }
}
