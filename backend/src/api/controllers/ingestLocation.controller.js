const vehicleStatusModel = require('../../models/vehicleStatus.model');
const cacheService = require('../../services/cache.service');
const routeMatchService = require('../../services/routeMatch.service');
const etaEngine = require('../../eta/eta.engine');
const { haversineKm } = require('../../utils/geo.utils');
const { locationPingSchema, batchIngestSchema } = require('../validators/ingestLocation.validator');
const logger = require('../../utils/logger');

// Per-vehicle last-seen tracker for rate limiting and dedup
const vehicleLastSeen = new Map(); // vehicle_id → { timestamp, lat, lng }

const MAX_SPEED_KMH = 250; // Reject GPS jumps implying > 250 km/h
const MIN_UPDATE_INTERVAL_MS = 2000; // 2 seconds between updates per vehicle

class IngestLocationController {
  /**
   * POST /ingest/location
   * Ingest a single GPS location ping.
   */
  async ingestSingle(req, res) {
    try {
      // Validate
      const { error, value } = locationPingSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
      }

      const result = await this._processPing(value);

      if (result.rejected) {
        return res.status(422).json({
          success: false,
          error: result.reason,
          vehicle_id: value.vehicle_id,
        });
      }

      if (result.skipped) {
        return res.status(200).json({
          success: true,
          status: 'skipped',
          reason: result.reason,
          vehicle_id: value.vehicle_id,
        });
      }

      return res.status(200).json({
        success: true,
        status: 'accepted',
        vehicle: result.vehicle,
      });
    } catch (err) {
      logger.error('IngestLocation.ingestSingle error', { message: err.message });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /ingest/location/batch
   * Ingest a batch of GPS pings (offline sync).
   */
  async ingestBatch(req, res) {
    try {
      // Validate
      const { error, value } = batchIngestSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
      }

      const { pings } = value;

      // Sort by timestamp ascending to preserve chronological order
      pings.sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA - tB;
      });

      let accepted = 0;
      let skipped = 0;
      let rejected = 0;
      const errors = [];

      for (const ping of pings) {
        const result = await this._processPing(ping, { isBatch: true });
        if (result.rejected) {
          rejected++;
          errors.push({ vehicle_id: ping.vehicle_id, reason: result.reason });
        } else if (result.skipped) {
          skipped++;
        } else {
          accepted++;
        }
      }

      return res.status(200).json({
        success: true,
        accepted,
        skipped,
        rejected,
        total: pings.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      logger.error('IngestLocation.ingestBatch error', { message: err.message });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Process a single GPS ping through the full pipeline.
   *
   * Pipeline:
   * 1. Per-vehicle rate limiting (skip if too frequent)
   * 2. Timestamp deduplication (skip if same timestamp)
   * 3. Jump rejection (reject if impossible speed)
   * 4. Route matching (snap to polyline, derive next_stop)
   * 5. ETA computation
   * 6. Upsert vehicle_status (latest state)
   * 7. Insert vehicle_positions (history) — via existing location ping model
   * 8. Publish vehicle:update via Redis
   *
   * @param {object} ping - Validated ping data
   * @param {object} options - { isBatch: boolean }
   * @returns {Promise<{ rejected?: boolean, skipped?: boolean, reason?: string, vehicle?: object }>}
   */
  async _processPing(ping, options = {}) {
    const {
      vehicle_id, bus_number, lat, lng, speed, heading,
      route_id, driver_name, accuracy, timestamp,
    } = ping;

    const now = Date.now();
    const pingTimestamp = timestamp ? new Date(timestamp).getTime() : now;

    // 1. Per-vehicle rate limiting
    const lastSeen = vehicleLastSeen.get(vehicle_id);
    if (lastSeen && !options.isBatch) {
      const timeSinceLastMs = now - lastSeen.processedAt;
      if (timeSinceLastMs < MIN_UPDATE_INTERVAL_MS) {
        return { skipped: true, reason: 'Rate limited: too frequent' };
      }
    }

    // 2. Timestamp deduplication — don't override latest with older data
    if (lastSeen && lastSeen.timestamp && pingTimestamp <= lastSeen.timestamp) {
      if (!options.isBatch) {
        return { skipped: true, reason: 'Duplicate or older timestamp' };
      }
      // In batch mode, still insert history but don't update latest state
    }

    // 3. Jump rejection — check if GPS jump implies impossible speed
    if (lastSeen && lastSeen.lat && lastSeen.lng) {
      const distKm = haversineKm(lastSeen.lat, lastSeen.lng, lat, lng);
      const timeDeltaHours = Math.max(
        (pingTimestamp - lastSeen.timestamp) / (1000 * 3600),
        0.0001 // avoid division by zero
      );
      const impliedSpeedKmh = distKm / timeDeltaHours;

      if (impliedSpeedKmh > MAX_SPEED_KMH) {
        logger.warn('GPS jump rejected', {
          vehicle_id,
          distKm: distKm.toFixed(2),
          impliedSpeedKmh: impliedSpeedKmh.toFixed(0),
          maxAllowed: MAX_SPEED_KMH,
        });
        return {
          rejected: true,
          reason: `Impossible GPS jump: ${impliedSpeedKmh.toFixed(0)} km/h implied (max ${MAX_SPEED_KMH})`,
        };
      }
    }

    // Update last-seen tracker
    vehicleLastSeen.set(vehicle_id, {
      lat,
      lng,
      timestamp: pingTimestamp,
      processedAt: now,
    });

    // 4. Route matching
    let routeMatch = { snappedLat: lat, snappedLng: lng, nextStopId: null, nextStopName: null, routeIndex: -1, distToNextStopKm: null };
    if (route_id) {
      try {
        routeMatch = await routeMatchService.matchToRoute(vehicle_id, lat, lng, route_id);
      } catch (err) {
        logger.warn('Route matching failed, using raw coords', {
          vehicle_id,
          error: err.message,
        });
      }
    }

    // 5. ETA computation
    let etaNextStop = null;
    if (routeMatch.nextStopId && routeMatch.distToNextStopKm !== null) {
      try {
        const vehicleForEta = { id: vehicle_id, lat, lng, route_id };
        const stopForEta = {
          id: routeMatch.nextStopId,
          name: routeMatch.nextStopName,
          lat: lat, // approximate
          lng: lng,
        };
        const etaResult = await etaEngine.predictETA(vehicleForEta, stopForEta);
        etaNextStop = etaResult.etaMin;
      } catch (err) {
        logger.warn('ETA computation failed', { vehicle_id, error: err.message });
      }
    }

    // 6. Upsert vehicle_status (latest state)
    const shouldUpdateLatest = !lastSeen || !lastSeen.timestamp || pingTimestamp >= lastSeen.timestamp;
    let vehicle = null;

    if (shouldUpdateLatest) {
      try {
        vehicle = await vehicleStatusModel.upsertVehicle({
          vehicle_id,
          bus_number,
          lat: routeMatch.snappedLat,
          lng: routeMatch.snappedLng,
          speed: speed || 0,
          heading: heading || 0,
          status: 'live',
          route_id,
          driver_name,
          accuracy,
        });
      } catch (err) {
        logger.error('Failed to upsert vehicle_status', {
          vehicle_id,
          error: err.message,
        });
      }
    }

    // 7. Insert into vehicle_positions history
    try {
      // Use the existing location ping model for history
      const locationPingModel = require('../../models/locationPing.model');
      await locationPingModel.insert({
        vehicle_id,
        lat: routeMatch.snappedLat,
        lng: routeMatch.snappedLng,
        speed_kmh: speed || 0,
        heading: heading || 0,
        seq: pingTimestamp,
        replayed: options.isBatch || false,
        signal_strength: accuracy ? String(accuracy) : null,
        timestamp: timestamp || new Date().toISOString(),
      });
    } catch (err) {
      // Don't fail the whole request if history insert fails
      logger.warn('Failed to insert position history', {
        vehicle_id,
        error: err.message,
      });
    }

    // 8. Publish vehicle:update via Redis
    try {
      await cacheService.publishVehicleUpdate(vehicle_id, {
        vehicle_id,
        bus_number,
        lat: routeMatch.snappedLat,
        lng: routeMatch.snappedLng,
        speed: speed || 0,
        heading: heading || 0,
        status: 'live',
        route_id: route_id || null,
        next_stop_id: routeMatch.nextStopId,
        next_stop_name: routeMatch.nextStopName,
        eta_next_stop: etaNextStop,
        last_updated: timestamp || new Date().toISOString(),
      });
    } catch (err) {
      logger.warn('Failed to publish vehicle update', {
        vehicle_id,
        error: err.message,
      });
    }

    return {
      vehicle: vehicle || {
        vehicle_id,
        lat: routeMatch.snappedLat,
        lng: routeMatch.snappedLng,
        status: 'live',
      },
    };
  }
}

module.exports = new IngestLocationController();
