import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDistanceMatrix, getSequentialDistances, getOptimizedRoute } from '../services/osrmService.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// ─── POST /api/routes/matrix — Get distance matrix ───────────────────────────
router.post('/matrix', authenticate, async (req, res, next) => {
  try {
    const { coordinates } = req.body;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return next(createError(400, 'At least 2 coordinate objects {lat, lng} required.', 'VALIDATION_ERROR'));
    }

    const { distances, durations } = await getDistanceMatrix(coordinates);
    res.json({ distances, durations });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/routes/sequential — Get sequential path distances ──────────────
router.post('/sequential', authenticate, async (req, res, next) => {
  try {
    const { coordinates } = req.body;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return next(createError(400, 'At least 2 coordinate objects {lat, lng} required.', 'VALIDATION_ERROR'));
    }

    const segments = await getSequentialDistances(coordinates);
    res.json({ segments });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/routes/optimize — Optimize route order ────────────────────────
router.post('/optimize', authenticate, async (req, res, next) => {
  try {
    const { coordinates, sourceIndex } = req.body;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return next(createError(400, 'At least 2 coordinate objects {lat, lng} required.', 'VALIDATION_ERROR'));
    }

    const result = await getOptimizedRoute(coordinates, sourceIndex || 0);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
