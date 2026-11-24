import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  PRODUCTS_API_URL: z.url().default('https://fakestoreapi.com'),
  DB_PATH: z.string().min(1).default('./data/eproduct.db'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SALES_INBOX: z.email(),
  MAIL_FROM: z.email(),
});

export type Config = z.infer<typeof configSchema>;

/** Fails fast at startup if configuration is missing or invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
