import nodemailer, { type Transporter } from 'nodemailer';
import { UpstreamError } from '../errors.ts';
import type { EmailMessage, EmailSender } from './EmailSender.ts';

interface Options {
  host: string;
  port: number;
  from: string;
}

export class SmtpEmailSender implements EmailSender {
  readonly #transport: Transporter;
  readonly #from: string;

  constructor({ host, port, from }: Options) {
    // Local Mailpit needs no auth/TLS. A real provider would add credentials from env.
    this.#transport = nodemailer.createTransport({ host, port, secure: false });
    this.#from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.#transport.sendMail({ from: this.#from, ...message });
    } catch (cause) {
      throw new UpstreamError('Could not send enquiry, please try again later', { cause });
    }
  }
}
