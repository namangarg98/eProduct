export interface EmailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}

/** The email provider. Swap SMTP for SES, SendGrid, etc. by adding an implementation. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
