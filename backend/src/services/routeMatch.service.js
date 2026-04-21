const routeService = require('./route.service');
const cacheService = require('./cache.service');
const { snapToPolyline, haversineKm } = require('../utils/geo.utils');
const logger = require('../utils/logger');

/**
 * Route Matching Service
 *
 * Snaps incoming GPS coordinates to the nearest point on a route polyline,
 * determines the `route_index` (progress along route), and derives
 * `next_stop_id` and distance to next stop.
 */

/**
 * Match a vehicle's position to its assigned route.
 *
 * @param {string} vehicleId
 * @param {number} lat
 * @param {number} lng
 * @param {string} routeId
 * @returns {Promise<{
 *   snappedLat: number,
 *   snappedLng: number,
 *   routeIndex: number,
 *   nextStopId: string|null,
 *   nextStopName: string|null,
 *   distToNextStopKm: number|null,
 *   totalStops: number
 * }>}
 */
async function matchToRoute(vehicleId, lat, lng, routeId) {
  const result = {
    snappedLat: lat,
    snappedLng: lng,
    routeIndex: -1,
    nextStopId: null,
    nextStopName: null,
    distToNextStopKm: null,
    totalStops: 0,
  };

  if (!routeId) return result;

  try {
    // Get route data
    const route = await routeService.getRouteById(routeId);
    if (!route) return result;

    // Snap to polyline
    const polyline = normalizePolyline(route.polyline);
    if (polyline.length > 0) {
      const snapped = snapToPolyline(lat, lng, polyline);
      result.snappedLat = snapped.lat;
      result.snappedLng = snapped.lng;
      result.routeIndex = snapped.index;
    }

    // Get stops for the route
    let stops = [];
    try {
      stops = await routeService.getStopsForRoute(routeId);
    } catch {
      // Use inline stops if available
      if (route.stops && Array.isArray(route.stops)) {
        stops = route.stops.map(s => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude || s.lat,
          longitude: s.longitude || s.lng,
          stop_sequence: s.stop_order || s.stop_sequence,
        }));
      }
    }

    result.totalStops = stops.length;

    if (stops.length === 0) return result;

    // Find the next stop (closest stop that is ahead of the vehicle)
    const nextStop = findNextStop(lat, lng, stops, result.routeIndex, polyline);
    if (nextStop) {
      result.nextStopId = nextStop.id;
      result.nextStopName = nextStop.name;
      result.distToNextStopKm = parseFloat(
        haversineKm(lat, lng, nextStop.lat, nextStop.lng).toFixed(3)
      );
    }

    // Cache route_index in Redis for the vehicle
    try {
      await cacheService.setVehicleState(vehicleId, {
        route_index: String(result.routeIndex),
        next_stop_id: result.nextStopId || '',
        next_stop_name: result.nextStopName || '',
      });
    } catch (cacheErr) {
      logger.warn('routeMatch: failed to cache route state', {
        vehicleId,
        error: cacheErr.message,
      });
    }

    return result;
  } catch (err) {
    logger.error('routeMatch.matchToRoute error', {
      vehicleId,
      routeId,
      message: err.message,
    });
    return result;
  }
}

/**
 * Normalize polyline to [{lat, lng}] format.
 * Supports both [lng, lat] (GeoJSON) and {lat, lng} formats.
 */
function normalizePolyline(polyline) {
  if (!polyline || !Array.isArray(polyline) || polyline.length === 0) return [];

  // If first element is an array → [lng, lat] format
  if (Array.isArray(polyline[0])) {
    return polyline.map(p => ({ lat: p[1], lng: p[0] }));
  }

  // If first element is an object with lat/lng
  if (typeof polyline[0] === 'object' && 'lat' in polyline[0]) {
    return polyline;
  }

  return [];
}

/**
 * Find the next stop ahead of the vehicle on the route.
 *
 * Strategy: find the closest stop, then pick the next one in sequence.
 * If we have a routeIndex, use it to determine direction of travel.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array} stops - sorted by stop_sequence
 * @param {number} routeIndex - index into polyline
 * @param {Array} polyline - normalized polyline points
 * @returns {{ id: string, name: string, lat: number, lng: number }|null}
 */
function findNextStop(lat, lng, stops, routeIndex, polyline) {
  if (!stops || stops.length === 0) return null;

  // Find the closest stop
  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const sLat = s.latitude || s.lat;
    const sLng = s.longitude || s.lng;
    const d = haversineKm(lat, lng, sLat, sLng);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  // The next stop is the one after the closest
  // (unless we're already at the last stop)
  const nextIdx = Math.min(closestIdx + 1, stops.length - 1);
  const next = stops[nextIdx];

  return {
    id: next.id,
    name: next.name,
    lat: next.latitude || next.lat,
    lng: next.longitude || next.lng,
  };
}

module.exports = { matchToRoute, normalizePolyline, findNextStop };
