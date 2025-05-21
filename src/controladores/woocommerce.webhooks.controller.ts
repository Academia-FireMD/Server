import { Body, Controller, HttpCode, HttpException, HttpStatus, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { WooCommerceWebhooksService } from '../servicios/woocommerce.webhooks.service';

@Controller('webhooks')
export class WooCommerceWebhooksController {
  private readonly logger = new Logger(WooCommerceWebhooksController.name);

  constructor(private readonly webhooksService: WooCommerceWebhooksService) {}

  private getHeaderCaseInsensitive(headers: any, key: string): string | undefined {
    const normalizedKey = key.toLowerCase();
    return Object.entries(headers)
      .find(([k, _]) => k.toLowerCase() === normalizedKey)?.[1] as string;
  }

  @Post('woocommerce')
  @HttpCode(HttpStatus.OK)
  async handleWooCommerceWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() body: any
  ) {
    try {
      const signature = this.getHeaderCaseInsensitive(request.headers, 'x-wc-webhook-signature');
      const topic = this.getHeaderCaseInsensitive(request.headers, 'x-wc-webhook-topic');
      const event = this.getHeaderCaseInsensitive(request.headers, 'x-wc-webhook-event');
      const deliveryId = this.getHeaderCaseInsensitive(request.headers, 'x-wc-webhook-delivery-id');

      this.logger.debug(`Received webhook - Topic: ${topic}, Event: ${event}, Delivery ID: ${deliveryId}`);

      // Detect if this is a ping request
      if (body.webhook_id && Object.keys(body).length === 1) {
        this.logger.debug('Received webhook ping request');
        return {
          message: 'Webhook ping received successfully',
          webhook_id: body.webhook_id
        };
      }

      // For real events, verify signature if present
      if (signature) {
        const rawBody = request.rawBody ? request.rawBody.toString('utf8') : JSON.stringify(body);
        const isValid = this.webhooksService.verifyWooCommerceWebhook(
          signature,
          rawBody
        );

        if (!isValid) {
          this.logger.error('Invalid webhook signature');
          throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
        }
      } else {
        this.logger.warn('No signature found in webhook request');
      }

      // Determine the event type from headers
      let eventType = 'subscription.updated'; // Default fallback
      if (topic) {
        // topic format is usually 'subscription.cancelled' or similar
        eventType = topic;
      } else if (event) {
        // If we have a separate event header, construct the topic
        eventType = `subscription.${event}`;
      }
      
      // Process the webhook with the full body as data
      const result = await this.webhooksService.processWebhook(eventType, body);
      
      this.logger.debug(`Webhook processed successfully: ${JSON.stringify(result, null, 2)}`);

      return {
        message: 'Webhook processed successfully',
        event: eventType,
        deliveryId,
        result
      };

    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 