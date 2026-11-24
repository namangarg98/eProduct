import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { CatalogueService } from './catalogueService.ts';
import { enquirySchema, type EnquiryService } from './enquiryService.ts';

// Generic safe ID format, so the route does not depend on Fake Store's numeric IDs.
const idParams = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid product id') });
const categoryParams = z.object({ name: z.string().trim().min(1).max(100) });
const searchQuery = z.object({ search: z.string().trim().min(1, 'Search term is required').max(100) });

/** Thin handlers: validate input, call a service, return JSON. Errors go to errorHandler. */
export function createRoutes(
  catalogue: CatalogueService,
  enquiries: EnquiryService,
  enquiryRateLimit: RequestHandler,
): Router {
  const router = Router();

  // Must be registered before /products/:id.
  router.get('/products/featured', async (_req, res) => {
    res.json(await catalogue.getFeatured());
  });

  // No auth: single-user PoC (see DECISIONS.md). Restrict these before any public deployment.
  router.put('/products/featured/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json({ productIds: await catalogue.addFeatured(id) });
  });

  router.delete('/products/featured/:id', (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json({ productIds: catalogue.removeFeatured(id) });
  });

  router.get('/products', async (req, res) => {
    const { search } = searchQuery.parse(req.query);
    res.json(await catalogue.search(search));
  });

  router.get('/products/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await catalogue.getProduct(id));
  });

  router.get('/categories', async (_req, res) => {
    res.json(await catalogue.listCategories());
  });

  router.get('/categories/:name/products', async (req, res) => {
    const { name } = categoryParams.parse(req.params);
    res.json(await catalogue.getCategoryProducts(name));
  });

  router.post('/enquiries', enquiryRateLimit, async (req, res) => {
    await enquiries.submit(enquirySchema.parse(req.body));
    res.status(204).end();
  });

  return router;
}
