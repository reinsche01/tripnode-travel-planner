import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { placesRateLimiter } from '../middleware/rateLimiter.js';
import { searchPlace, getAutocompleteSuggestions } from '../services/placesService.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// ─── GET /api/places/search ───────────────────────────────────────────────────
router.get('/search', authenticate, placesRateLimiter, async (req, res, next) => {
  try {
    const { query, lat, lng } = req.query;
    if (!query) return next(createError(400, 'query parameter is required.', 'VALIDATION_ERROR'));

    const place = await searchPlace(
      query,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );

    if (!place) return next(createError(404, 'No place found for this query.', 'NOT_FOUND'));
    res.json({ place });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/places/autocomplete ────────────────────────────────────────────
router.get('/autocomplete', authenticate, placesRateLimiter, async (req, res, next) => {
  try {
    const { input, location } = req.query;
    if (!input) return next(createError(400, 'input parameter is required.', 'VALIDATION_ERROR'));

    const suggestions = await getAutocompleteSuggestions(input, location || null);
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
