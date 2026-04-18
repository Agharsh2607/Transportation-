const rateLimit = require('express-rate-limit');

/**
 * General rate limit for vehicle-facing endpoints.
 * 100 requests per minute per IP.
 */
const vehicleRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please slow down.',
    code: 429,
  },
});

/**
 * Higher-throughput rate limit for the GPS ingest endpoint.
 * 500 requests per minute per IP to accommodate batch uploads.
 */
const ingestRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Ingest rate limit exceeded.',
    code: 429,
  },
});

module.exports = { vehicleRateLimit, ingestRateLimit };
