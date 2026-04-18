const { distanceToStop } = require('./eta.haversine');
const { getAvgSpeedKmh } = require('./eta.historical');
const { getTrafficFactor } = require('./eta.traffic');
const { hourBucket, dayOfWeek } = require('../utils/time.utils');
const logger = require('../utils/logger');

/**
 * Predict the ETA from a vehicle's current position to a single stop.
 *
 * Formula:
 *   distanceKm = haversine(vehicle, stop)
 *   avgSpeed   = historical avg speed for route/hour/dow (default 30 km/h)
 *   traffic    = rule-based factor (1.0 – 1.4)
 *   etaMin     = round((distanceKm / avgSpeed) * 60 * traffic)
 *
 * @param {{ lat: number, lng: number, route_id: string }} vehicle
 * @param {{ id: string, name: string, lat: number, lng: number }} stop
 * @returns {Promise<{ stopId: string, stopName: string, etaMin: number, confidence: string }>}
 */
async function predictETA(vehicle, stop) {
  try {
    const now = new Date();
    const hour = hourBucket(now);
    const dow = dayOfWeek(now);

    const distanceKm = distanceToStop(vehicle, stop);
    const { speed: avgSpeed, fromHistory } = await getAvgSpeedKmh(vehicle.route_id, hour, dow);
    const trafficFactor = getTrafficFactor(vehicle.route_id, hour);

    const etaMin = avgSpeed > 0
      ? Math.round((distanceKm / avgSpeed) * 60 * trafficFactor)
      : 0;

    const confidence = fromHistory ? 'high' : 'medium';

    return {
      stopId: stop.id,
      stopName: stop.name,
      etaMin,
      confidence,
      distanceKm: parseFloat(distanceKm.toFixed(3)),
      avgSpeedKmh: parseFloat(avgSpeed.toFixed(1)),
      trafficFactor,
    };
  } catch (err) {
    logger.error('eta.engine.predictETA error', { vehicleId: vehicle.id, stopId: stop.id, message: err.message });
    return {
      stopId: stop.id,
      stopName: stop.name,
      etaMin: null,
      confidence: 'low',
    };
  }
}

/**
 * Predict ETAs for all stops on a vehicle's route.
 * @param {{ lat: number, lng: number, route_id: string }} vehicle
 * @param {Array<{ id: string, name: string, lat: number, lng: number }>} stopsArray
 * @returns {Promise<Array>}
 */
async function predictAllStops(vehicle, stopsArray) {
  if (!stopsArray || stopsArray.length === 0) return [];
  const predictions = await Promise.all(stopsArray.map((stop) => predictETA(vehicle, stop)));
  return predictions;
}

module.exports = { predictETA, predictAllStops };
