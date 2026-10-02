import supabase from '../utils/supabaseClient.js';
import { createError } from './errorHandler.js';

/**
 * Middleware to verify Supabase JWT and attach user to req.user.
 * Use on all protected routes.
 */
export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Authentication required. Please log in.', 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(createError(401, 'Invalid or expired token. Please log in again.', 'INVALID_TOKEN'));
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(createError(500, 'Authentication check failed.', 'AUTH_ERROR'));
  }
}
