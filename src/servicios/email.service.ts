import { Injectable } from '@nestjs/common';
import { SuscripcionTipo } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';
import * as MarkdownIt from 'markdown-it';
import { dateFormatter } from 'src/utils/utils';

@Injectable()
export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Usa la API Key de SendGrid desde variables de entorno
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<any> {
    try {
      console.log('Enviando email de reseteo de contraseña:', { to, resetLink });
      const msg = {
        to,
        from: 'info@academiafiremd.com',
        templateId: 'd-d89654461e164f858b26470a6c882d81',
        dynamicTemplateData: {
          reset_link: resetLink,
        },
      };

      console.log('Configuración del mensaje:', msg);
      const res = await sgMail.send(msg);
      console.log('Respuesta de SendGrid:', res);
      return res;
    } catch (error) {
      console.error('Error al enviar email de reseteo:', error.response?.body || error);
      throw error;
    }
  }

  async sendEventReminder(to: string, data: {
    nombreAlumno: string;
    nombreEvento: string;
    fechaEvento: string;
    horaEvento: string;
    comentarios: string;
  }): Promise<any> {
    try {
      console.log('Enviando email con datos:', { to, data });

      // Inicializar markdown-it con todas las opciones habilitadas
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true
      });

      // Convertir el markdown a HTML
      const comentariosHtml = md.render(data.comentarios || '');
      const msg = {
        to,
        from: 'info@academiafiremd.com', // Tu email verificado en SendGrid
        templateId: 'd-5d3bb1069e6e4ad38bd35ed2413fc9b6',
        dynamicTemplateData: {
          NombreAlumno: data.nombreAlumno,
          NombreEvento: data.nombreEvento,
          FechaEvento: data.fechaEvento,
          HoraEvento: data.horaEvento,
          Comentarios: comentariosHtml
        },
      };

      console.log('Configuración del mensaje:', msg);
      const res = await sgMail.send(msg);
      console.log('Respuesta de SendGrid:', res);
      return res;
    } catch (error) {
      console.error('Error al enviar email:', error.response?.body || error);
      throw error;
    }
  }

  async sendSubscriptionActivationEmail(to: string, data: {
    tempToken: string;
    planType: SuscripcionTipo;
    cartData: any;
    nombre: string;
  }): Promise<any> {
    try {
      const activationLink = `${process.env.HOST_FRONT}/auth/activate-subscription?token=${data.tempToken}`;

      const msg = {
        to,
        from: 'info@academiafiremd.com',
        templateId: 'd-c360e4fe5f2146a49f5f1104e5e11acd',
        dynamicTemplateData: {
          nombre: data.nombre,
          activation_link: activationLink,
          plan_type: data.planType,
          price: data.cartData.price?.toFixed(2) || '0.00',
          productName: data.cartData.productName || 'Plan Academia FireMD',
        },
      };

      const res = await sgMail.send(msg);
      return res;
    } catch (error) {
      console.error('Error al enviar email de activación:', error.response?.body || error);
      throw error;
    }
  }

  async sendSubscriptionRenewalEmail(to: string, data: {
    planType: SuscripcionTipo;
    nextBillingDate: Date;
    price: number;
    nombre: string;
  }): Promise<any> {
    try {
      const msg = {
        to,
        from: 'info@academiafiremd.com',
        templateId: 'd-fb1f3bd39d7b4182b5d7cde463ffffa7',
        dynamicTemplateData: {
          nombre: data.nombre,
          plan_type: data.planType,
          next_billing_date: dateFormatter.format(data.nextBillingDate),
          price: data.price.toFixed(2)
        },
      };

      const res = await sgMail.send(msg);
      return res;
    } catch (error) {
      console.error('Error al enviar email de renovación:', error.response?.body || error);
      throw error;
    }
  }

  async sendSubscriptionCancelledEmail(to: string, data: {
    planType: SuscripcionTipo;
    endDate: Date;
    nombre: string;
  }): Promise<any> {
    try {
      const msg = {
        to,
        from: 'info@academiafiremd.com',
        templateId: 'd-3ebbdf950a2a4007baeb2948bd2211fe',
        dynamicTemplateData: {
          nombre: data.nombre,
          plan_type: data.planType,
          end_date: dateFormatter.format(data.endDate)
        },
      };

      const res = await sgMail.send(msg);
      return res;
    } catch (error) {
      console.error('Error al enviar email de cancelación:', error.response?.body || error);
      throw error;
    }
  }
}
