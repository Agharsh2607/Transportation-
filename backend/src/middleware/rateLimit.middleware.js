const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

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

/**
 * Per-vehicle rate limiter.
 *
 * Limits each vehicle_id to 1 update per MIN_INTERVAL_MS milliseconds.
 * Uses an in-memory Map (cleared periodically to prevent memory leaks).
 *
 * Also deduplicates by timestamp: rejects if incoming timestamp equals
 * the last seen timestamp for that vehicle.
 */
const vehicleUpdateTimestamps = new Map(); // vehicle_id → { lastUpdateMs, lastTimestamp }
const MIN_INTERVAL_MS = 2000; // 2 seconds between updates per vehicle
const CLEANUP_INTERVAL_MS = 300000; // Clean up stale entries every 5 minutes

function perVehicleRateLimit(req, res, next) {
  const vehicleId = req.body?.vehicle_id;
  if (!vehicleId) {
    // No vehicle_id in body, skip this check
    return next();
  }

  const now = Date.now();
  const entry = vehicleUpdateTimestamps.get(vehicleId);

  if (entry) {
    // Check time since last update
    const timeSinceLast = now - entry.lastUpdateMs;
    if (timeSinceLast < MIN_INTERVAL_MS) {
      logger.debug('Per-vehicle rate limit hit', {
        vehicle_id: vehicleId,
        timeSinceLastMs: timeSinceLast,
        minInterval: MIN_INTERVAL_MS,
      });
      return res.status(429).json({
        success: false,
        error: `Rate limited: vehicle ${vehicleId} can only update every ${MIN_INTERVAL_MS / 1000}s`,
        retryAfterMs: MIN_INTERVAL_MS - timeSinceLast,
      });
    }

    // Check for timestamp deduplication
    const incomingTimestamp = req.body?.timestamp;
    if (incomingTimestamp && entry.lastTimestamp === incomingTimestamp) {
      logger.debug('Duplicate timestamp rejected', {
        vehicle_id: vehicleId,
        timestamp: incomingTimestamp,
      });
      return res.status(200).json({
        success: true,
        status: 'skipped',
        reason: 'Duplicate timestamp',
      });
    }
  }

  // Record this update
  vehicleUpdateTimestamps.set(vehicleId, {
    lastUpdateMs: now,
    lastTimestamp: req.body?.timestamp || null,
  });

  next();
}

// Periodic cleanup of stale entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 600000; // 10 minutes
  let cleaned = 0;

  for (const [vehicleId, entry] of vehicleUpdateTimestamps.entries()) {
    if (now - entry.lastUpdateMs > staleThreshold) {
      vehicleUpdateTimestamps.delete(vehicleId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Per-vehicle rate limiter cleanup', { cleaned });
  }
}, CLEANUP_INTERVAL_MS);

module.exports = { vehicleRateLimit, ingestRateLimit, perVehicleRateLimit };
