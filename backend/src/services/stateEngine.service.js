const vehicleStatusModel = require('../models/vehicleStatus.model');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

/**
 * Vehicle State Engine
 *
 * Runs a periodic sweep (every 7 seconds) to recompute vehicle statuses
 * based on `last_updated` timestamps. Publishes `vehicle:status` events
 * on Redis when a vehicle's status changes (e.g. live → delayed → offline).
 *
 * Thresholds (configurable):
 *   ≤ 10s since last update → "live"
 *   ≤ 30s → "delayed"
 *   > 30s → "offline"
 */

const STATUS_THRESHOLDS = {
  LIVE_MAX_SECONDS: 10,
  DELAYED_MAX_SECONDS: 30,
};

const SWEEP_INTERVAL_MS = 7000; // 7 seconds

// Track previous statuses to detect changes
const previousStatuses = new Map();
let sweepInterval = null;

/**
 * Compute status from seconds since last update.
 * @param {number} secondsSinceUpdate
 * @returns {'live'|'delayed'|'offline'}
 */
function computeStatus(secondsSinceUpdate) {
  if (secondsSinceUpdate <= STATUS_THRESHOLDS.LIVE_MAX_SECONDS) return 'live';
  if (secondsSinceUpdate <= STATUS_THRESHOLDS.DELAYED_MAX_SECONDS) return 'delayed';
  return 'offline';
}

/**
 * Run a single sweep: recompute all vehicle statuses and emit changes.
 */
async function sweep() {
  try {
    const vehicles = await vehicleStatusModel.getAllActiveVehicles();

    let transitions = 0;

    for (const vehicle of vehicles) {
      const newStatus = computeStatus(vehicle.seconds_since_update || 0);
      const prevStatus = previousStatuses.get(vehicle.vehicle_id);

      // Update the in-memory tracker
      previousStatuses.set(vehicle.vehicle_id, newStatus);

      // If the status actually changed, publish an event and update DB
      if (prevStatus && prevStatus !== newStatus) {
        transitions++;

        // Update status in DB/memory
        try {
          await vehicleStatusModel.upsertVehicle({
            ...vehicle,
            status: newStatus,
          });
        } catch (err) {
          logger.warn('State engine: failed to update vehicle status in DB', {
            vehicle_id: vehicle.vehicle_id,
            error: err.message,
          });
        }

        // Publish status change event
        await cacheService.publishStatusChange(
          vehicle.vehicle_id,
          prevStatus,
          newStatus
        );

        logger.info('Vehicle status transition', {
          vehicle_id: vehicle.vehicle_id,
          from: prevStatus,
          to: newStatus,
        });
      }
    }

    // Clean up old entries from previousStatuses
    const activeIds = new Set(vehicles.map(v => v.vehicle_id));
    for (const id of previousStatuses.keys()) {
      if (!activeIds.has(id)) {
        previousStatuses.delete(id);
      }
    }

    if (transitions > 0) {
      logger.debug('State engine sweep complete', {
        vehiclesScanned: vehicles.length,
        transitions,
      });
    }
  } catch (err) {
    logger.error('State engine sweep error', { message: err.message });
  }
}

/**
 * Start the state engine periodic sweep.
 */
function start() {
  if (sweepInterval) {
    logger.warn('State engine already running');
    return;
  }

  sweepInterval = setInterval(sweep, SWEEP_INTERVAL_MS);
  logger.info(`State engine started (sweep every ${SWEEP_INTERVAL_MS / 1000}s)`);

  // Run an initial sweep after a short delay
  setTimeout(sweep, 2000);
}

/**
 * Stop the state engine.
 */
function stop() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
    logger.info('State engine stopped');
  }
}

/**
 * Get current status counts from the tracked state.
 * @returns {{ live: number, delayed: number, offline: number, total: number }}
 */
function getStatusCounts() {
  const counts = { live: 0, delayed: 0, offline: 0, total: 0 };
  for (const status of previousStatuses.values()) {
    counts[status] = (counts[status] || 0) + 1;
    counts.total++;
  }
  return counts;
}

module.exports = {
  start,
  stop,
  sweep,
  computeStatus,
  getStatusCounts,
  STATUS_THRESHOLDS,
};
