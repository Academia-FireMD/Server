import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Usa la API Key de SendGrid desde variables de entorno
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<any> {
    const msg = {
      to,
      from: 'jarvanjarvencio@gmail.com',
      templateId: 'd-d89654461e164f858b26470a6c882d81',
      dynamicTemplateData: {
        reset_link: resetLink,
      },
    };

    const res = await sgMail.send(msg);
    return res;
  }
}
