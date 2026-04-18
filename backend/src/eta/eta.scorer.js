const etaRecordModel = require('../models/etaRecord.model');
const logger = require('../utils/logger');

/**
 * Calculate prediction error and persist the result to the eta_records table.
 * This feeds the historical accuracy system and enables model improvement over time.
 *
 * @param {string} vehicleId
 * @param {string} stopId
 * @param {string} routeId
 * @param {number} predictedMin - What the engine predicted
 * @param {number} actualMin - What actually happened
 * @returns {Promise<object>} Updated eta record
 */
async function scoreAndLog(vehicleId, stopId, routeId, predictedMin, actualMin) {
  try {
    // First insert the prediction record
    const record = await etaRecordModel.insert({
      vehicle_id: vehicleId,
      route_id: routeId,
      stop_id: stopId,
      predicted_min: predictedMin,
      hour_bucket: new Date().getHours(),
      day_of_week: new Date().getDay(),
      confidence: 'scored',
    });

    // Then fill in the actual arrival data
    const updated = await etaRecordModel.updateActual(
      record.id,
      actualMin,
      new Date().toISOString()
    );

    const errorMin = Math.abs(predictedMin - actualMin);
    logger.info('ETA scored', { vehicleId, stopId, predictedMin, actualMin, errorMin });

    return updated;
  } catch (err) {
    logger.error('eta.scorer.scoreAndLog error', { vehicleId, stopId, message: err.message });
    throw err;
  }
}

module.exports = { scoreAndLog };
