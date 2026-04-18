const { query } = require('../config/db.config');
const logger = require('../utils/logger');

/**
 * Insert a new ETA prediction record.
 * @param {{ vehicle_id, route_id, stop_id, predicted_min, hour_bucket, day_of_week, confidence }} record
 */
async function insert(record) {
  const { vehicle_id, route_id, stop_id, predicted_min, hour_bucket, day_of_week, confidence } = record;
  try {
    const result = await query(
      `INSERT INTO eta_records
         (vehicle_id, route_id, stop_id, predicted_min, hour_bucket, day_of_week, confidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [vehicle_id, route_id, stop_id, predicted_min, hour_bucket, day_of_week, confidence]
    );
    return result.rows[0];
  } catch (err) {
    logger.error('etaRecord.model.insert error', { message: err.message });
    throw err;
  }
}

/**
 * Fill in the actual arrival data once a vehicle reaches a stop.
 * @param {number} id - ETA record ID
 * @param {number} actualMin - Actual minutes taken
 * @param {string} arrivedAt - ISO timestamp of arrival
 */
async function updateActual(id, actualMin, arrivedAt) {
  try {
    const result = await query(
      `UPDATE eta_records
       SET actual_min = $1, arrived_at = $2, error_min = ABS(predicted_min - $1)
       WHERE id = $3
       RETURNING *`,
      [actualMin, arrivedAt, id]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error('etaRecord.model.updateActual error', { id, message: err.message });
    throw err;
  }
}

/**
 * Get the average historical speed for a route at a specific hour and day of week.
 * Used by the ETA engine to improve predictions.
 * @param {string} routeId
 * @param {number} hourBucket - 0-23
 * @param {number} dayOfWeek - 0-6
 * @returns {Promise<number|null>} Average speed in km/h, or null if no data
 */
async function getHistoricalAvgSpeed(routeId, hourBucket, dayOfWeek) {
  try {
    const result = await query(
      `SELECT AVG(
         (lp.speed_kmh)
       ) AS avg_speed
       FROM location_pings lp
       JOIN vehicles v ON lp.vehicle_id = v.id
       WHERE v.route_id = $1
         AND EXTRACT(HOUR FROM lp.recorded_at) = $2
         AND EXTRACT(DOW FROM lp.recorded_at) = $3
         AND lp.speed_kmh > 0
         AND lp.recorded_at >= NOW() - INTERVAL '30 days'`,
      [routeId, hourBucket, dayOfWeek]
    );
    const avg = result.rows[0]?.avg_speed;
    return avg ? parseFloat(avg) : null;
  } catch (err) {
    logger.error('etaRecord.model.getHistoricalAvgSpeed error', { routeId, message: err.message });
    throw err;
  }
}

/**
 * Get the average prediction error (accuracy) for a route.
 * @param {string} routeId
 * @returns {Promise<number>} Average error in minutes
 */
async function getAccuracy(routeId) {
  try {
    const result = await query(
      `SELECT AVG(error_min) AS avg_error
       FROM eta_records
       WHERE route_id = $1
         AND error_min IS NOT NULL`,
      [routeId]
    );
    return parseFloat(result.rows[0]?.avg_error || 0);
  } catch (err) {
    logger.error('etaRecord.model.getAccuracy error', { routeId, message: err.message });
    throw err;
  }
}

module.exports = { insert, updateActual, getHistoricalAvgSpeed, getAccuracy };
