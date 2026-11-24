import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class NotFoundError extends Error {
  override name = 'NotFoundError';
}

/** The request is valid but conflicts with current state, e.g. 5 products are already top rated. */
export class ConflictError extends Error {
  override name = 'ConflictError';
}

/** A dependency (product source, email) failed. `message` is safe to show to clients. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';
}

/** Central handler: maps known errors to status codes and never leaks stack traces. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof UpstreamError) {
    console.error('upstream_failed', err.message, err.cause);
    res.status(502).json({ error: err.message });
    return;
  }
  // Errors raised by express.json(), e.g. malformed JSON (400) or body too large (413).
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Invalid request' });
    return;
  }
  console.error('unhandled_error', err);
  res.status(500).json({ error: 'Something went wrong' });
};
