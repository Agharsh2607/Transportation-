const logger = require('../utils/logger');

/**
 * Centralized Express error handler.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  // Determine status code
  let statusCode = err.status || err.statusCode || 500;

  // Map common error names to status codes
  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'UnauthorizedError') statusCode = 401;
  if (err.name === 'NotFoundError') statusCode = 404;

  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: statusCode === 500 ? err.stack : undefined,
  });

  const response = {
    error: message,
    code: statusCode,
  };

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
