import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import seedIds from './db/featured.seed.json' with { type: 'json' };
import { openFeaturedRepository } from './db/featuredRepository.ts';
import { SmtpEmailSender } from './email/SmtpEmailSender.ts';
import { FakeStoreProductRepository } from './products/FakeStoreProductRepository.ts';

// Composition root: the only place that chooses concrete implementations.
const config = loadConfig();

const app = createApp({
  products: new FakeStoreProductRepository({ baseUrl: config.PRODUCTS_API_URL }),
  featured: openFeaturedRepository(config.DB_PATH, seedIds),
  email: new SmtpEmailSender({ host: config.SMTP_HOST, port: config.SMTP_PORT, from: config.MAIL_FROM }),
  salesInbox: config.SALES_INBOX,
});

app.listen(config.PORT, () => {
  console.log(`api_listening port=${config.PORT}`);
});
