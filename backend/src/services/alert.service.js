const { redisCache } = require('../config/redis.config');
const logger = require('../utils/logger');

const DELAY_THRESHOLD_MIN = 10; // Alert if ETA exceeds schedule by this many minutes

/**
 * Check ETA predictions for significant delays and publish alerts.
 * A delay is flagged when any predicted ETA exceeds the threshold.
 *
 * @param {{ id: string, route_id: string }} vehicle
 * @param {Array<{ stopId: string, stopName: string, etaMin: number }>} etaPredictions
 */
async function checkForDelays(vehicle, etaPredictions) {
  if (!vehicle.route_id || !etaPredictions || etaPredictions.length === 0) return;

  try {
    for (const prediction of etaPredictions) {
      if (prediction.etaMin !== null && prediction.etaMin > DELAY_THRESHOLD_MIN) {
        const message = `Vehicle ${vehicle.id} is ${prediction.etaMin} min away from stop "${prediction.stopName}" — possible delay.`;
        await publishAlert(vehicle.route_id, {
          type: 'delay',
          vehicle_id: vehicle.id,
          stop_id: prediction.stopId,
          stop_name: prediction.stopName,
          eta_min: prediction.etaMin,
          threshold_min: DELAY_THRESHOLD_MIN,
          message,
          timestamp: new Date().toISOString(),
        });
        // Only alert on the first delayed stop to avoid flooding
        break;
      }
    }
  } catch (err) {
    logger.error('alert.service.checkForDelays error', { vehicleId: vehicle.id, message: err.message });
  }
}

/**
 * Publish an alert message to the route-specific Redis Pub/Sub channel.
 * Subscribers (e.g., WebSocket broadcaster) can relay this to connected clients.
 *
 * @param {string} routeId
 * @param {object|string} message
 */
async function publishAlert(routeId, message) {
  const channel = `alerts:${routeId}`;
  try {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await redisCache.publish(channel, payload);
    logger.info('Alert published', { channel, routeId });
  } catch (err) {
    logger.error('alert.service.publishAlert error', { routeId, message: err.message });
  }
}

module.exports = { checkForDelays, publishAlert };
