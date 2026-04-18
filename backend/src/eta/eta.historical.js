const etaRecordModel = require('../models/etaRecord.model');
const logger = require('../utils/logger');

const DEFAULT_SPEED_KMH = 30;

/**
 * Get the average historical speed for a route at a given hour and day of week.
 * Falls back to DEFAULT_SPEED_KMH (30 km/h) if no historical data is available.
 * @param {string} routeId
 * @param {number} hour - Hour bucket (0-23)
 * @param {number} dow - Day of week (0-6)
 * @returns {Promise<{ speed: number, fromHistory: boolean }>}
 */
async function getAvgSpeedKmh(routeId, hour, dow) {
  try {
    const avg = await etaRecordModel.getHistoricalAvgSpeed(routeId, hour, dow);
    if (avg !== null && avg > 0) {
      return { speed: avg, fromHistory: true };
    }
    return { speed: DEFAULT_SPEED_KMH, fromHistory: false };
  } catch (err) {
    logger.error('eta.historical.getAvgSpeedKmh error', { routeId, message: err.message });
    return { speed: DEFAULT_SPEED_KMH, fromHistory: false };
  }
}

module.exports = { getAvgSpeedKmh, DEFAULT_SPEED_KMH };
