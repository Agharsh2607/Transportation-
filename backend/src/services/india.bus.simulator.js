const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class IndiaBusSimulator {
  constructor(ingestService) {
    this.ingestService = ingestService;
    this.activeVehicles = new Map();
    this.simulationInterval = null;
    this.isRunning = false;
  }

  /**
   * Start simulation for a route
   */
  startRouteSimulation(routeId, routeData) {
    if (this.activeVehicles.has(routeId)) {
      logger.warn(`Route ${routeId} already simulating`);
      return;
    }

    // Create 2-3 buses per route based on number of stops
    const busCount = Math.max(2, Math.ceil(routeData.stops?.length / 15 || 2));
    
    for (let i = 0; i < busCount; i++) {
      const vehicleId = `DL${String(i + 1).padStart(2, '0')}${routeId}`;
      
      const polyline = routeData.polyline || [];
      if (polyline.length === 0) {
        logger.warn(`Route ${routeId} has no polyline, skipping simulation`);
        continue;
      }

      const vehicle = {
        vehicleId,
        routeId,
        coordinates: polyline,
        stops: routeData.stops || [],
        currentIndex: Math.floor(Math.random() * polyline.length),
        speed: 12 + Math.random() * 8, // 12-20 m/s
        heading: 0,
        networkQuality: 90 + Math.random() * 10,
        lastUpdate: Date.now(),
      };

      this.activeVehicles.set(vehicleId, vehicle);
      logger.info(`Started simulation for vehicle ${vehicleId} on route ${routeId}`);
    }
  }

  /**
   * Start all simulations
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.simulationInterval = setInterval(() => {
      this.updateAllVehicles();
    }, 2000); // Update every 2 seconds

    logger.info('India bus simulator started');
  }

  /**
   * Update all vehicles
   */
  updateAllVehicles() {
    for (const [vehicleId, vehicle] of this.activeVehicles) {
      this.updateVehiclePosition(vehicleId, vehicle);
    }
  }

  /**
   * Update single vehicle position
   */
  updateVehiclePosition(vehicleId, vehicle) {
    const { coordinates, stops, speed } = vehicle;

    if (coordinates.length === 0) return;

    if (vehicle.currentIndex >= coordinates.length - 1) {
      vehicle.currentIndex = 0;
    }

    const current = coordinates[vehicle.currentIndex];
    const next = coordinates[Math.min(vehicle.currentIndex + 1, coordinates.length - 1)];

    // Interpolate position
    const segmentDistance = this.haversineDistance(current, next);
    const timePerSegment = segmentDistance > 0 ? segmentDistance / speed : 1;
    const timeSinceLastUpdate = (Date.now() - vehicle.lastUpdate) / 1000;
    const progress = Math.min(timeSinceLastUpdate / timePerSegment, 1);

    const lat = current[1] + (next[1] - current[1]) * progress;
    const lng = current[0] + (next[0] - current[0]) * progress;

    // Find next stop
    const nextStop = this.findNextStop(vehicle, { lat, lng });

    // Create GPS packet
    const packet = {
      vehicle_id: vehicleId,
      latitude: lat,
      longitude: lng,
      speed: Math.max(0, speed + (Math.random() - 0.5) * 2),
      heading: this.calculateHeading(current, next),
      timestamp: Date.now(),
      network_quality: Math.max(50, vehicle.networkQuality + (Math.random() - 0.5) * 5),
      packet_id: uuidv4(),
      route_id: vehicle.routeId,
      next_stop_id: nextStop?.stop_id,
      next_stop_name: nextStop?.stop_name,
    };

    // Send to ingest
    try {
      this.ingestService.ingestGPSPacket(packet);
    } catch (err) {
      logger.warn(`Failed to ingest packet for ${vehicleId}`, { error: err.message });
    }

    // Move to next segment
    if (progress >= 1) {
      vehicle.currentIndex++;
      vehicle.lastUpdate = Date.now();
    }
  }

  /**
   * Find next stop
   */
  findNextStop(vehicle, currentPos) {
    const stops = vehicle.stops;
    if (!stops || stops.length === 0) return null;

    let closestStop = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const distance = this.haversineDistance(
        [currentPos.lng, currentPos.lat],
        [stop.longitude, stop.lon || stop.stop_lon, currentPos.lat]
      );

      if (distance < minDistance && distance > 50) { // At least 50m ahead
        minDistance = distance;
        closestStop = stop;
      }
    }

    return closestStop;
  }

  /**
   * Haversine distance (in meters)
   */
  haversineDistance(coord1, coord2) {
    const R = 6371000; // Earth radius in meters
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate heading (bearing) between two points
   */
  calculateHeading(from, to) {
    const dLng = ((to[0] - from[0]) * Math.PI) / 180;
    const lat1 = (from[1] * Math.PI) / 180;
    const lat2 = (to[1] * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const heading = (Math.atan2(y, x) * 180) / Math.PI;

    return (heading + 360) % 360;
  }

  stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    this.activeVehicles.clear();
    logger.info('India bus simulator stopped');
  }
}

module.exports = IndiaBusSimulator;
