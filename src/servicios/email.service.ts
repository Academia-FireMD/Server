import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

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
      const msg = {
        to,
        from: 'info@academiafiremd.com', // Tu email verificado en SendGrid
        templateId: 'd-5d3bb1069e6e4ad38bd35ed2413fc9b6',
        dynamicTemplateData: {
          NombreAlumno: data.nombreAlumno,
          NombreEvento: data.nombreEvento,
          FechaEvento: data.fechaEvento,
          HoraEvento: data.horaEvento,
          Comentarios: data.comentarios
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
}
