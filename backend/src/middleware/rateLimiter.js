import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  },
});

/**
 * Stricter limiter for AI generation endpoints.
 * 10 requests per hour per IP.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'AI generation limit reached. Please wait before generating again.',
    code: 'AI_RATE_LIMITED',
  },
});

/**
 * Places search limiter: 30 requests per minute per IP.
 */
export const placesRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many place searches. Slow down a bit!',
    code: 'PLACES_RATE_LIMITED',
  },
});
