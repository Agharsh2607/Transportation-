const locationPingModel = require('../models/locationPing.model');
const cacheService = require('./cache.service');
const routeService = require('./route.service');
const etaEngine = require('../eta/eta.engine');
const alertService = require('./alert.service');
const { snapToPolyline } = require('../utils/geo.utils');
const { isReplayedPacket } = require('../utils/packet.utils');
const { isoNow } = require('../utils/time.utils');
const logger = require('../utils/logger');

/**
 * Full processing pipeline for a single GPS packet.
 *
 * Steps:
 * 1. Detect replayed packets (log but still process)
 * 2. Snap lat/lng to nearest route polyline point
 * 3. Get route stops
 * 4. Run ETA engine for all stops
 * 5. Persist to location_pings
 * 6. Update Redis vehicle state
 * 7. Update active vehicles sorted set
 * 8. Publish live update to Redis Pub/Sub
 * 9. Check for delay alerts
 *
 * @param {object} packet
 */
async function processPacket(packet) {
  try {
    // Step 1: Detect replayed packets
    if (isReplayedPacket(packet)) {
      logger.info('Processing replayed packet', { vehicle_id: packet.vehicle_id, seq: packet.seq });
    }

    // Step 2: Snap to route polyline
    // The route polyline is stored as a JSON array on the route record.
    // If no polyline is available, the raw coordinates are used as-is.
    let snappedLat = packet.lat;
    let snappedLng = packet.lng;

    try {
      const route = await routeService.getRouteById(packet.route_id || packet.vehicle_route_id);
      if (route && route.polyline && Array.isArray(route.polyline)) {
        const snapped = snapToPolyline(packet.lat, packet.lng, route.polyline);
        snappedLat = snapped.lat;
        snappedLng = snapped.lng;
      }
    } catch (snapErr) {
      logger.warn('Could not snap to polyline, using raw coords', { message: snapErr.message });
    }

    const enrichedPacket = { ...packet, lat: snappedLat, lng: snappedLng };

    // Step 3: Get route stops
    let stops = [];
    let routeId = packet.route_id;
    try {
      if (!routeId) {
        // Try to get route_id from vehicle state in cache
        const state = await cacheService.getVehicleState(packet.vehicle_id);
        routeId = state?.route_id;
      }
      if (routeId) {
        stops = await routeService.getStopsForRoute(routeId);
      }
    } catch (stopsErr) {
      logger.warn('Could not fetch route stops', { message: stopsErr.message });
    }

    // Step 4: ETA predictions
    let etaPredictions = [];
    const vehicleForEta = {
      id: packet.vehicle_id,
      lat: snappedLat,
      lng: snappedLng,
      route_id: routeId,
    };

    if (stops.length > 0) {
      etaPredictions = await etaEngine.predictAllStops(vehicleForEta, stops);
    }

    const nextStopEta = etaPredictions.length > 0 ? etaPredictions[0] : null;

    // Step 5: Persist to DB
    try {
      await locationPingModel.insert(enrichedPacket);
    } catch (dbErr) {
      logger.error('Failed to persist location ping', { vehicle_id: packet.vehicle_id, message: dbErr.message });
    }

    // Step 6: Update Redis vehicle state
    const stateObj = {
      vehicle_id: packet.vehicle_id,
      lat: snappedLat,
      lng: snappedLng,
      speed_kmh: packet.speed_kmh,
      heading: packet.heading,
      signal_strength: packet.signal_strength,
      route_id: routeId || '',
      eta_next_stop: nextStopEta ? nextStopEta.etaMin : '',
      eta_next_stop_name: nextStopEta ? nextStopEta.stopName : '',
      last_seen: packet.timestamp || isoNow(),
      status: 'active',
    };
    await cacheService.setVehicleState(packet.vehicle_id, stateObj);

    // Cache per-stop ETAs
    if (routeId && etaPredictions.length > 0) {
      for (const pred of etaPredictions) {
        await cacheService.setStopETA(routeId, pred.stopId, packet.vehicle_id, pred.etaMin);
      }
      await cacheService.addVehicleToRoute(routeId, packet.vehicle_id);
    }

    // Step 7: Update active vehicles sorted set
    await cacheService.updateActiveVehicles(packet.vehicle_id, packet.timestamp || isoNow());

    // Step 8: Publish live update
    const livePayload = {
      vehicle_id: packet.vehicle_id,
      lat: snappedLat,
      lng: snappedLng,
      speed: packet.speed_kmh,
      heading: packet.heading,
      route_id: routeId,
      eta_next_stop: nextStopEta ? nextStopEta.etaMin : null,
      status: 'active',
      timestamp: packet.timestamp || isoNow(),
    };
    await cacheService.publishUpdate('live_updates', livePayload);

    // Step 9: Check for delay alerts
    if (etaPredictions.length > 0) {
      await alertService.checkForDelays(vehicleForEta, etaPredictions);
    }

    logger.debug('Packet processed', { vehicle_id: packet.vehicle_id, seq: packet.seq });
  } catch (err) {
    logger.error('position.service.processPacket error', { vehicle_id: packet.vehicle_id, message: err.message });
  }
}

/**
 * Get the latest position for a vehicle.
 * Tries Redis first, falls back to the database.
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
async function getLatestPosition(vehicleId) {
  try {
    const cached = await cacheService.getVehicleState(vehicleId);
    if (cached) return cached;

    const dbPing = await locationPingModel.getLatest(vehicleId);
    return dbPing;
  } catch (err) {
    logger.error('position.service.getLatestPosition error', { vehicleId, message: err.message });
    return null;
  }
}

/**
 * Get location history for a vehicle from the database.
 * @param {string} vehicleId
 * @param {string} from - ISO timestamp
 * @param {string} to - ISO timestamp
 * @returns {Promise<Array>}
 */
async function getVehicleHistory(vehicleId, from, to) {
  try {
    return await locationPingModel.getHistory(vehicleId, from, to);
  } catch (err) {
    logger.error('position.service.getVehicleHistory error', { vehicleId, message: err.message });
    return [];
  }
}

module.exports = { processPacket, getLatestPosition, getVehicleHistory };
