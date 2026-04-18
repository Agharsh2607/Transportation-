/**
 * Rule-based traffic factor calculator.
 *
 * This module returns a multiplier that slows down ETA predictions during
 * high-traffic periods. The rules are intentionally simple for the hackathon.
 *
 * EXTENSIBILITY NOTE:
 * This function is designed to be replaced by an ML model in production.
 * A trained gradient-boosted model (e.g., XGBoost) could take routeId, hour,
 * day-of-week, weather, and event data as features and return a continuous
 * traffic factor. The interface (routeId, hour) → factor remains the same.
 */

const RUSH_HOUR_FACTOR = 1.4;   // Morning (8-9) and evening (17-19) rush hours
const MIDDAY_FACTOR = 1.2;      // Midday congestion (12-14)
const NORMAL_FACTOR = 1.0;      // Off-peak

/**
 * Get a traffic delay factor for a given route and hour.
 * @param {string} routeId - Route identifier (reserved for future per-route ML models)
 * @param {number} hour - Hour of day (0-23)
 * @returns {number} Multiplicative factor (>= 1.0)
 */
function getTrafficFactor(routeId, hour) {
  // Morning rush: 8:00–9:59
  if (hour >= 8 && hour <= 9) return RUSH_HOUR_FACTOR;

  // Evening rush: 17:00–19:59
  if (hour >= 17 && hour <= 19) return RUSH_HOUR_FACTOR;

  // Midday congestion: 12:00–13:59
  if (hour >= 12 && hour <= 13) return MIDDAY_FACTOR;

  return NORMAL_FACTOR;
}

module.exports = { getTrafficFactor, RUSH_HOUR_FACTOR, MIDDAY_FACTOR, NORMAL_FACTOR };
