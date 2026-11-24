import { z } from 'zod';
import type { CatalogueService } from './catalogueService.ts';
import type { EmailSender } from './email/EmailSender.ts';

// Name/phone must be single-line: blocks email header injection via CR/LF.
const singleLine = (max: number) =>
  z.string().trim().max(max).regex(/^[^\r\n]*$/, 'Must be a single line');

export const enquirySchema = z.object({
  productId: z.string().trim().min(1).max(64),
  name: singleLine(100).min(1, 'Name is required'),
  email: z.email('A valid email is required').max(254),
  phone: singleLine(30)
    .regex(/^[0-9 +()-]*$/, 'Phone may only contain digits, spaces and + ( ) -')
    .optional(),
  message: z.string().trim().max(2000).optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export class EnquiryService {
  readonly #catalogue: CatalogueService;
  readonly #email: EmailSender;
  readonly #salesInbox: string;

  constructor(catalogue: CatalogueService, email: EmailSender, salesInbox: string) {
    this.#catalogue = catalogue;
    this.#email = email;
    this.#salesInbox = salesInbox;
  }

  /** Emails the sales inbox. The product is looked up server-side, never trusted from the client. */
  async submit(enquiry: EnquiryInput): Promise<void> {
    const product = await this.#catalogue.getProduct(enquiry.productId);
    const title = product.title.replace(/[\r\n]+/g, ' ');

    await this.#email.send({
      to: this.#salesInbox,
      replyTo: enquiry.email,
      subject: `New enquiry: ${title}`,
      // Plain text only: no HTML rendering means no HTML injection.
      text: [
        `Product: ${title} (ID ${product.id})`,
        `Price: $${product.price.toFixed(2)}`,
        '',
        `Name: ${enquiry.name}`,
        `Email: ${enquiry.email}`,
        `Phone: ${enquiry.phone || '-'}`,
        '',
        'Message:',
        enquiry.message || '-',
      ].join('\n'),
    });
  }
}
