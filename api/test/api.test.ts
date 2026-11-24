import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { openFeaturedRepository } from '../src/db/featuredRepository.ts';
import type { EmailSender } from '../src/email/EmailSender.ts';
import { UpstreamError } from '../src/errors.ts';
import { InMemoryProductRepository, RecordingEmailSender } from './fakes.ts';

const SALES_INBOX = 'sales@test.local';

function setup(email: EmailSender = new RecordingEmailSender()) {
  const app = createApp({
    products: new InMemoryProductRepository(),
    featured: openFeaturedRepository(':memory:', ['5', '1', '6', '3', '4']),
    email,
    salesInbox: SALES_INBOX,
  });
  return { app, email };
}

const validEnquiry = {
  productId: '1',
  name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '+61 400 000 000',
  message: 'Is this in stock?',
};

describe('API', () => {
  it('GET /api/products/featured returns the chosen products in order', async () => {
    const res = await request(setup().app).get('/api/products/featured').expect(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(['5', '1', '6', '3', '4']);
  });

  describe('choosing top rated products', () => {
    const featuredIds = async (app: ReturnType<typeof setup>['app']) =>
      (await request(app).get('/api/products/featured')).body.map((p: { id: string }) => p.id);

    it('DELETE removes a product and the home page reflects it', async () => {
      const { app } = setup();
      const res = await request(app).delete('/api/products/featured/1').expect(200);
      expect(res.body).toEqual({ productIds: ['5', '6', '3', '4'] });
      expect(await featuredIds(app)).toEqual(['5', '6', '3', '4']);
    });

    it('PUT adds a product to the end of the list', async () => {
      const { app } = setup();
      await request(app).delete('/api/products/featured/1').expect(200);
      const res = await request(app).put('/api/products/featured/2').expect(200);
      expect(res.body).toEqual({ productIds: ['5', '6', '3', '4', '2'] });
      expect(await featuredIds(app)).toEqual(['5', '6', '3', '4', '2']);
    });

    it('PUT returns 409 when 5 products are already top rated', async () => {
      const res = await request(setup().app).put('/api/products/featured/2').expect(409);
      expect(res.body.error).toBe('You can choose at most 5 top rated products');
    });

    it('PUT and DELETE are idempotent', async () => {
      const { app } = setup();
      expect((await request(app).put('/api/products/featured/1').expect(200)).body.productIds).toHaveLength(5);
      await request(app).delete('/api/products/featured/2').expect(200);
      expect(await featuredIds(app)).toEqual(['5', '1', '6', '3', '4']);
    });

    it('PUT returns 404 for an unknown product and 400 for a malformed id', async () => {
      const { app } = setup();
      await request(app).delete('/api/products/featured/1');
      await request(app).put('/api/products/featured/999').expect(404);
      await request(app).put('/api/products/featured/bad%20id!').expect(400);
      expect(await featuredIds(app)).toEqual(['5', '6', '3', '4']);
    });
  });

  it('GET /api/categories lists categories', async () => {
    const res = await request(setup().app).get('/api/categories').expect(200);
    expect(res.body).toEqual(['electronics', 'jewelery', "men's clothing"]);
  });

  it('GET /api/categories/:name/products splits top rated and others (URL-encoded name)', async () => {
    const res = await request(setup().app).get(`/api/categories/${encodeURIComponent("men's clothing")}/products`).expect(200);
    expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(['6']);
    expect(res.body.others).toEqual([]);
  });

  it('GET /api/categories/:name/products returns 404 for an unknown category', async () => {
    await request(setup().app).get('/api/categories/toys/products').expect(404);
  });

  it('GET /api/products?search returns only matching products', async () => {
    const res = await request(setup().app).get('/api/products?search=RING').expect(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(['4']);
  });

  it.each([
    ['missing', '/api/products'],
    ['blank', '/api/products?search=%20%20'],
    ['too long', `/api/products?search=${'a'.repeat(101)}`],
    ['repeated param', '/api/products?search=a&search=b'],
  ])('GET /api/products returns 400 when search is %s', async (_label, url) => {
    await request(setup().app).get(url).expect(400);
  });

  it('GET /api/products/:id returns a product, 404 when unknown, 400 when malformed', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/products/1').expect(200);
    expect(res.body.title).toBe('Wireless Keyboard');
    await request(app).get('/api/products/999').expect(404);
    await request(app).get('/api/products/bad%20id!').expect(400);
  });

  it('returns 502 without leaking details when the product source fails', async () => {
    const products = new InMemoryProductRepository();
    vi.spyOn(products, 'findById').mockRejectedValue(new UpstreamError('Product service unavailable', { cause: 'ECONNRESET secret-host' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp({ products, featured: openFeaturedRepository(':memory:', []), email: new RecordingEmailSender(), salesInbox: SALES_INBOX });
    const res = await request(app).get('/api/products/1').expect(502);
    expect(res.body).toEqual({ error: 'Product service unavailable' });
  });

  it('sets security headers', async () => {
    const res = await request(setup().app).get('/api/categories');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  describe('POST /api/enquiries', () => {
    it('emails the sales inbox and returns 204', async () => {
      const email = new RecordingEmailSender();
      await request(setup(email).app).post('/api/enquiries').send(validEnquiry).expect(204);
      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]).toMatchObject({ to: SALES_INBOX, replyTo: 'jane@example.com', subject: 'New enquiry: Wireless Keyboard' });
      expect(email.sent[0]!.text).toContain('Name: Jane Citizen');
      expect(email.sent[0]!.text).toContain('Is this in stock?');
    });

    it('uses the server-side product title, ignoring any client-supplied title', async () => {
      const email = new RecordingEmailSender();
      await request(setup(email).app).post('/api/enquiries').send({ ...validEnquiry, productTitle: 'FREE!!' }).expect(204);
      expect(email.sent[0]!.subject).toBe('New enquiry: Wireless Keyboard');
      expect(email.sent[0]!.text).not.toContain('FREE!!');
    });

    it.each([
      ['missing name', { ...validEnquiry, name: '' }],
      ['invalid email', { ...validEnquiry, email: 'not-an-email' }],
      ['header injection in name', { ...validEnquiry, name: 'Jane\r\nBcc: victim@example.com' }],
      ['invalid phone', { ...validEnquiry, phone: 'call me' }],
      ['message too long', { ...validEnquiry, message: 'x'.repeat(2001) }],
    ])('returns 400 and sends nothing for %s', async (_label, body) => {
      const email = new RecordingEmailSender();
      const res = await request(setup(email).app).post('/api/enquiries').send(body).expect(400);
      expect(res.body.error).toBe('Invalid request');
      expect(email.sent).toHaveLength(0);
    });

    it('returns 404 for an unknown product and sends nothing', async () => {
      const email = new RecordingEmailSender();
      await request(setup(email).app).post('/api/enquiries').send({ ...validEnquiry, productId: '999' }).expect(404);
      expect(email.sent).toHaveLength(0);
    });

    it('returns 400 for malformed JSON and 413 for an oversized body', async () => {
      const { app } = setup();
      await request(app).post('/api/enquiries').set('content-type', 'application/json').send('{bad').expect(400);
      await request(app).post('/api/enquiries').send({ ...validEnquiry, message: 'x'.repeat(11_000) }).expect(413);
    });

    it('returns 502 when the email provider fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const failing: EmailSender = { send: async () => { throw new UpstreamError('Could not send enquiry, please try again later'); } };
      const res = await request(setup(failing).app).post('/api/enquiries').send(validEnquiry).expect(502);
      expect(res.body.error).toBe('Could not send enquiry, please try again later');
    });

    it('rate limits to 5 enquiries per minute per client', async () => {
      const { app } = setup();
      for (let i = 0; i < 5; i++) await request(app).post('/api/enquiries').send(validEnquiry).expect(204);
      await request(app).post('/api/enquiries').send(validEnquiry).expect(429);
    });
  });
});
