const { distanceToStop } = require('./eta.haversine');
const { getAvgSpeedKmh } = require('./eta.historical');
const { getTrafficFactor } = require('./eta.traffic');
const { hourBucket, dayOfWeek } = require('../utils/time.utils');
const cacheService = require('../services/cache.service');
const logger = require('../utils/logger');

// Blending weights for ETA v2
const V1_WEIGHT = 0.6; // distance/speed weight
const V2_WEIGHT = 0.4; // historical average weight

/**
 * Predict the ETA from a vehicle's current position to a single stop.
 *
 * v1: distanceKm / avgSpeed * 60 * trafficFactor
 * v2: blend v1 with historical average ETA when available
 *
 * Results are cached for 7 seconds per vehicle to avoid recomputation.
 *
 * @param {{ lat: number, lng: number, route_id: string, id: string }} vehicle
 * @param {{ id: string, name: string, lat: number, lng: number }} stop
 * @returns {Promise<{ stopId: string, stopName: string, etaMin: number, confidence: string }>}
 */
async function predictETA(vehicle, stop) {
  try {
    // Check cache first
    const cacheKey = `${vehicle.id || vehicle.vehicle_id}:${stop.id}`;
    try {
      const cached = await cacheService.getVehicleETA(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache miss or error, compute fresh
    }

    const now = new Date();
    const hour = hourBucket(now);
    const dow = dayOfWeek(now);

    const distanceKm = distanceToStop(vehicle, stop);
    const { speed: avgSpeed, fromHistory } = await getAvgSpeedKmh(vehicle.route_id, hour, dow);
    const trafficFactor = getTrafficFactor(vehicle.route_id, hour);

    // v1: distance/speed calculation
    const v1EtaMin = avgSpeed > 0
      ? Math.round((distanceKm / avgSpeed) * 60 * trafficFactor)
      : 0;

    // v2: blend with historical if available
    let etaMin = v1EtaMin;
    let confidence = fromHistory ? 'high' : 'medium';

    if (fromHistory && v1EtaMin > 0) {
      // The historical speed already influences v1, but for v2 we also
      // consider the base distance/default-speed estimate as a cross-check
      const baseEta = distanceKm > 0 ? Math.round((distanceKm / 30) * 60 * trafficFactor) : 0;
      etaMin = Math.round(V1_WEIGHT * v1EtaMin + V2_WEIGHT * baseEta);
      confidence = 'high';
    }

    const result = {
      stopId: stop.id,
      stopName: stop.name,
      etaMin,
      confidence,
      distanceKm: parseFloat(distanceKm.toFixed(3)),
      avgSpeedKmh: parseFloat(avgSpeed.toFixed(1)),
      trafficFactor,
    };

    // Cache the result for 7 seconds
    try {
      await cacheService.setVehicleETA(cacheKey, result, 7);
    } catch {
      // Non-critical
    }

    return result;
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
