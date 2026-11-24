import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { CatalogueService } from './catalogueService.ts';
import type { FeaturedRepository } from './db/featuredRepository.ts';
import type { EmailSender } from './email/EmailSender.ts';
import { EnquiryService } from './enquiryService.ts';
import { errorHandler } from './errors.ts';
import type { ProductRepository } from './products/ProductRepository.ts';
import { createRoutes } from './routes.ts';

const ENQUIRY_LIMIT_PER_MINUTE = 5;

export interface AppDependencies {
  products: ProductRepository;
  featured: FeaturedRepository;
  email: EmailSender;
  salesInbox: string;
}

/** Builds the app from injected dependencies, so tests can pass fakes. */
export function createApp({ products, featured, email, salesInbox }: AppDependencies): Express {
  const catalogue = new CatalogueService(products, featured);
  const enquiries = new EnquiryService(catalogue, email, salesInbox);
  const enquiryRateLimit = rateLimit({
    windowMs: 60_000,
    limit: ENQUIRY_LIMIT_PER_MINUTE,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many enquiries, please try again in a minute' },
  });

  const app = express();
  // The web container (nginx) or Vite dev server proxies /api; trust only local/private
  // proxies so rate limiting sees the real client IP from X-Forwarded-For.
  app.set('trust proxy', 'loopback, uniquelocal');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', createRoutes(catalogue, enquiries, enquiryRateLimit));
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);
  return app;
}
