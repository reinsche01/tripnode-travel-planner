/**
 * Centralized error handler middleware for Express.
 * Always the last middleware registered.
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Validation errors (Joi)
  if (err.isJoi) {
    return res.status(400).json({
      error: true,
      message: err.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Supabase / DB errors
  if (err.code && err.code.startsWith('PG')) {
    return res.status(500).json({
      error: true,
      message: 'Database error occurred.',
      code: 'DB_ERROR',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Creates a structured API error.
 */
export function createError(status, message, code = 'ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
