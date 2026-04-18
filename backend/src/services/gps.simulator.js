/**
 * GPS Simulator - Mimics real driver mobile app sending GPS updates
 * Simulates vehicles moving along predefined routes with realistic behavior
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class GPSSimulator {
  constructor(ingestService) {
    this.ingestService = ingestService;
    this.activeVehicles = new Map();
    this.simulationInterval = null;
    this.isRunning = false;
  }

  /**
   * Start GPS simulation for a vehicle on a route
   */
  startVehicleSimulation(vehicleId, routeId, routeCoordinates, speed = 15) {
    if (this.activeVehicles.has(vehicleId)) {
      logger.warn(`Vehicle ${vehicleId} already simulating`);
      return;
    }

    const vehicle = {
      vehicleId,
      routeId,
      coordinates: routeCoordinates,
      currentIndex: 0,
      speed, // m/s (15 m/s ≈ 54 km/h)
      heading: 0,
      networkQuality: 100,
      lastUpdate: Date.now(),
    };

    this.activeVehicles.set(vehicleId, vehicle);
    logger.info(`Started GPS simulation for vehicle ${vehicleId} on route ${routeId}`);
  }

  /**
   * Stop GPS simulation for a vehicle
   */
  stopVehicleSimulation(vehicleId) {
    if (this.activeVehicles.delete(vehicleId)) {
      logger.info(`Stopped GPS simulation for vehicle ${vehicleId}`);
    }
  }

  /**
   * Start the main simulation loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Update GPS every 2 seconds (realistic mobile app behavior)
    this.simulationInterval = setInterval(() => {
      this.updateAllVehicles();
    }, 2000);

    logger.info('GPS simulator started');
  }

  /**
   * Stop the simulation loop
   */
  stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    logger.info('GPS simulator stopped');
  }

  /**
   * Update all active vehicles
   */
  updateAllVehicles() {
    for (const [vehicleId, vehicle] of this.activeVehicles) {
      this.updateVehiclePosition(vehicleId, vehicle);
    }
  }

  /**
   * Update a single vehicle's position
   */
  updateVehiclePosition(vehicleId, vehicle) {
    const { coordinates, currentIndex, speed } = vehicle;

    if (currentIndex >= coordinates.length - 1) {
      // Route completed, restart
      vehicle.currentIndex = 0;
    }

    const current = coordinates[vehicle.currentIndex];
    const next = coordinates[vehicle.currentIndex + 1];

    // Calculate progress along the segment
    const segmentDistance = this.haversineDistance(current, next);
    const timePerSegment = segmentDistance / speed; // seconds
    const timeSinceLastUpdate = (Date.now() - vehicle.lastUpdate) / 1000;
    const progress = Math.min(timeSinceLastUpdate / timePerSegment, 1);

    // Interpolate position
    const lat = current[1] + (next[1] - current[1]) * progress;
    const lng = current[0] + (next[0] - current[0]) * progress;

    // Calculate heading
    const heading = this.calculateHeading(current, next);
    vehicle.heading = heading;

    // Simulate network quality variations (80-100%)
    vehicle.networkQuality = 80 + Math.random() * 20;

    // Create GPS packet
    const packet = {
      vehicle_id: vehicleId,
      latitude: lat,
      longitude: lng,
      speed: speed + (Math.random() - 0.5) * 2, // Add slight variation
      heading,
      timestamp: Date.now(),
      network_quality: vehicle.networkQuality,
      packet_id: uuidv4(),
    };

    // Send to ingest service
    this.ingestService.ingestGPSPacket(packet);

    // Move to next segment if progress complete
    if (progress >= 1) {
      vehicle.currentIndex++;
      vehicle.lastUpdate = Date.now();
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
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
   * Calculate heading between two points
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

  /**
   * Get active vehicle count
   */
  getActiveVehicleCount() {
    return this.activeVehicles.size;
  }

  /**
   * Get vehicle status
   */
  getVehicleStatus(vehicleId) {
    return this.activeVehicles.get(vehicleId);
  }
}

module.exports = GPSSimulator;
