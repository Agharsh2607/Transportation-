const cacheService = require('./cache.service');
const etaEngine = require('../eta/eta.engine');
const routeService = require('./route.service');
const logger = require('../utils/logger');
const geoUtils = require('../utils/geo.utils');

class GPSService {
  constructor() {
    this.activeVehicles = new Map();
    this.vehicleRoutes = new Map();
    this.lastUpdateTimes = new Map();
  }

  /**
   * Process incoming GPS update from driver
   */
  async processGPSUpdate(gpsData) {
    const {
      vehicle_id,
      route_id,
      driver_name,
      latitude,
      longitude,
      speed,
      accuracy,
      timestamp,
    } = gpsData;

    try {
      // Get route information
      let route = this.vehicleRoutes.get(vehicle_id);
      if (!route || route.id !== route_id) {
        route = await routeService.getRouteById(route_id);
        if (route) {
          this.vehicleRoutes.set(vehicle_id, route);
        }
      }

      // Calculate additional data
      const heading = this.calculateHeading(vehicle_id, latitude, longitude);
      const nextStop = this.findNextStop(route, latitude, longitude);
      const eta = this.calculateETA(nextStop, latitude, longitude, speed);
      const status = this.determineVehicleStatus(vehicle_id, timestamp);

      // Create vehicle state
      const vehicleState = {
        vehicle_id,
        route_id,
        driver_name,
        latitude,
        longitude,
        speed,
        accuracy,
        heading,
        timestamp,
        next_stop_id: nextStop?.id,
        next_stop_name: nextStop?.name,
        eta_seconds: eta,
        status,
        network_quality: this.calculateNetworkQuality(accuracy),
      };

      // Store in cache
      await cacheService.setVehicleState(vehicle_id, vehicleState);
      
      // Update active vehicles list
      this.activeVehicles.set(vehicle_id, vehicleState);
      this.lastUpdateTimes.set(vehicle_id, timestamp);

      // Broadcast to WebSocket clients
      this.broadcastVehicleUpdate(vehicleState);

      logger.info('GPS update processed', {
        vehicle_id,
        route_id,
        latitude,
        longitude,
        speed,
        next_stop: nextStop?.name,
      });

      return {
        success: true,
        timestamp,
        next_stop: nextStop?.name,
        eta_seconds: eta,
        status,
      };
    } catch (error) {
      logger.error('GPS processing error', {
        vehicle_id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get latest position for a vehicle
   */
  async getVehiclePosition(vehicleId) {
    try {
      // Try cache first
      const cached = await cacheService.getVehicleState(vehicleId);
      if (cached) {
        return cached;
      }

      // Try in-memory store
      return this.activeVehicles.get(vehicleId) || null;
    } catch (error) {
      logger.error('Get vehicle position error', {
        vehicleId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get all active vehicles
   */
  async getAllActiveVehicles() {
    try {
      const vehicles = [];
      const currentTime = Date.now();

      // Get from cache and in-memory store
      for (const [vehicleId, vehicle] of this.activeVehicles) {
        const lastUpdate = this.lastUpdateTimes.get(vehicleId) || 0;
        const timeSinceUpdate = (currentTime - lastUpdate) / 1000;

        // Update status based on last update time
        let status = 'live';
        if (timeSinceUpdate > 30) {
          status = 'offline';
        } else if (timeSinceUpdate > 10) {
          status = 'delayed';
        }

        vehicles.push({
          ...vehicle,
          status,
          last_update_seconds: Math.floor(timeSinceUpdate),
        });
      }

      return vehicles;
    } catch (error) {
      logger.error('Get all vehicles error', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate heading based on previous position
   */
  calculateHeading(vehicleId, currentLat, currentLng) {
    const previous = this.activeVehicles.get(vehicleId);
    if (!previous) return 0;

    return geoUtils.calculateBearing(
      previous.latitude,
      previous.longitude,
      currentLat,
      currentLng
    );
  }

  /**
   * Find the next stop on the route
   */
  findNextStop(route, latitude, longitude) {
    if (!route || !route.stops) return null;

    let closestStop = null;
    let minDistance = Infinity;

    for (const stop of route.stops) {
      const distance = geoUtils.haversineDistance(
        latitude,
        longitude,
        stop.latitude,
        stop.longitude
      );

      // Only consider stops that are ahead (within reasonable distance)
      if (distance < minDistance && distance > 50) {
        minDistance = distance;
        closestStop = stop;
      }
    }

    return closestStop;
  }

  /**
   * Calculate ETA to next stop
   */
  calculateETA(nextStop, currentLat, currentLng, speed) {
    if (!nextStop || speed <= 0) return null;

    const distance = geoUtils.haversineDistance(
      currentLat,
      currentLng,
      nextStop.latitude,
      nextStop.longitude
    );

    // Convert speed from m/s to km/h for calculation
    const speedKmh = speed * 3.6;
    const distanceKm = distance / 1000;

    if (speedKmh <= 0) return null;

    // ETA in seconds
    const etaHours = distanceKm / speedKmh;
    return Math.round(etaHours * 3600);
  }

  /**
   * Determine vehicle status based on update frequency
   */
  determineVehicleStatus(vehicleId, timestamp) {
    const lastUpdate = this.lastUpdateTimes.get(vehicleId);
    if (!lastUpdate) return 'live';

    const timeSinceUpdate = (timestamp - lastUpdate) / 1000;

    if (timeSinceUpdate < 10) return 'live';
    if (timeSinceUpdate < 30) return 'delayed';
    return 'offline';
  }

  /**
   * Calculate network quality based on GPS accuracy
   */
  calculateNetworkQuality(accuracy) {
    if (!accuracy) return 100;

    // Better accuracy = higher quality
    if (accuracy <= 5) return 100;
    if (accuracy <= 10) return 90;
    if (accuracy <= 20) return 80;
    if (accuracy <= 50) return 70;
    if (accuracy <= 100) return 60;
    return 50;
  }

  /**
   * Broadcast vehicle update to WebSocket clients
   */
  broadcastVehicleUpdate(vehicleState) {
    try {
      // Get WebSocket broadcaster
      const { broadcast } = require('../websocket/ws.broadcaster');
      
      // Broadcast to route-specific room
      if (vehicleState.route_id) {
        broadcast(vehicleState.route_id, {
          type: 'vehicle_update',
          vehicle: vehicleState,
          timestamp: Date.now(),
        });
      }

      // Also publish to Redis for other services
      const { redisPubSub } = require('../config/redis.config');
      redisPubSub.publish('live_updates', JSON.stringify(vehicleState));
    } catch (error) {
      logger.warn('WebSocket broadcast failed', { error: error.message });
    }
  }

  /**
   * Clean up old vehicle data
   */
  cleanupOldVehicles() {
    const currentTime = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [vehicleId, lastUpdate] of this.lastUpdateTimes) {
      if (currentTime - lastUpdate > maxAge) {
        this.activeVehicles.delete(vehicleId);
        this.lastUpdateTimes.delete(vehicleId);
        this.vehicleRoutes.delete(vehicleId);
        logger.info('Cleaned up old vehicle', { vehicleId });
      }
    }
  }
}

// Create singleton instance
const gpsService = new GPSService();

// Clean up old vehicles every 2 minutes
setInterval(() => {
  gpsService.cleanupOldVehicles();
}, 2 * 60 * 1000);

module.exports = gpsService;