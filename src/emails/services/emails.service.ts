import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Resend } from 'resend';
import config from 'src/config';

@Injectable()
export class EmailsService {
  resend: Resend;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this.resend = new Resend(this.configService.apiKeyResend);
  }

  async sendEmail(email: string, subject: string, text: string) {
    const { data, error } = await this.resend.emails.send({
      from: 'My Tracker <no-reply@focus-loop-api.danniel.dev>',
      to: email,
      subject,
      text,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
