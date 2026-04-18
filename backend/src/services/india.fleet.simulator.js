const { INDIA_CITIES, generateAllCityRoutes, haversineDistance } = require('../data/india.cities.data');
const vehicleStatusModel = require('../models/vehicleStatus.model');
const logger = require('../utils/logger');

/**
 * Large-Scale India Fleet Simulator
 * Simulates ~2000 buses across 8 major Indian cities
 */
class IndiaFleetSimulator {
  constructor() {
    this.routes = [];
    this.vehicles = [];
    this.isRunning = false;
    this.updateInterval = null;
    this.targetVehicleCount = 2000;
    this.updateFrequency = 3000; // 3 seconds
    this.statusDistribution = {
      live: 0.75,    // 75% live
      delayed: 0.15, // 15% delayed
      offline: 0.10  // 10% offline
    };
  }

  /**
   * Initialize the fleet simulation
   */
  async initialize() {
    try {
      logger.info('Initializing India Fleet Simulator...');
      
      // Generate routes for all cities
      this.routes = generateAllCityRoutes();
      logger.info(`Generated ${this.routes.length} routes across ${Object.keys(INDIA_CITIES).length} cities`);
      
      // Generate vehicles distributed across routes
      this.vehicles = this.generateFleetVehicles();
      logger.info(`Generated ${this.vehicles.length} vehicles for simulation`);
      
      // Initialize vehicle positions
      await this.initializeVehiclePositions();
      
      logger.info('India Fleet Simulator initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize India Fleet Simulator', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate fleet vehicles distributed across all routes
   */
  generateFleetVehicles() {
    const vehicles = [];
    let vehicleCounter = 1;
    
    // Calculate vehicles per city based on population/bus count
    const totalBusCount = Object.values(INDIA_CITIES).reduce((sum, city) => sum + city.busCount, 0);
    
    for (const route of this.routes) {
      const cityData = INDIA_CITIES[route.city];
      const vehiclesPerRoute = Math.ceil((cityData.busCount / this.routes.filter(r => r.city === route.city).length));
      
      for (let i = 0; i < vehiclesPerRoute; i++) {
        const vehicle = {
          vehicle_id: `IND-${String(vehicleCounter).padStart(4, '0')}`,
          bus_number: `${route.city.toUpperCase()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          route_id: route.route_id,
          route_name: route.route_name,
          city: route.city,
          city_name: route.city_name,
          
          // Movement properties
          polyline: route.polyline,
          currentIndex: Math.floor(Math.random() * route.polyline.length),
          direction: Math.random() > 0.5 ? 1 : -1, // 1 = forward, -1 = backward
          baseSpeed: Math.random() * 20 + 25, // 25-45 km/h base speed
          currentSpeed: 0,
          
          // Status properties
          status: this.getRandomStatus(),
          lastUpdate: new Date(),
          updateInterval: Math.random() * 2000 + 2000, // 2-4 seconds
          
          // Driver simulation
          driver_name: this.generateDriverName(),
          shift_start: this.generateShiftTime(),
          
          // Network simulation
          networkQuality: Math.random() * 0.3 + 0.7, // 70-100%
          
          // Position tracking
          lat: 0,
          lng: 0,
          heading: 0,
          accuracy: Math.random() * 10 + 5 // 5-15 meters
        };
        
        // Set initial position
        const [lng, lat] = vehicle.polyline[vehicle.currentIndex];
        vehicle.lat = lat;
        vehicle.lng = lng;
        vehicle.heading = this.calculateHeading(vehicle);
        
        vehicles.push(vehicle);
        vehicleCounter++;
        
        if (vehicleCounter > this.targetVehicleCount) break;
      }
      
      if (vehicleCounter > this.targetVehicleCount) break;
    }
    
    return vehicles.slice(0, this.targetVehicleCount);
  }

  /**
   * Initialize vehicle positions in the database
   */
  async initializeVehiclePositions() {
    logger.info('Initializing vehicle positions in database...');
    
    for (const vehicle of this.vehicles) {
      try {
        await vehicleStatusModel.upsertVehicle({
          vehicle_id: vehicle.vehicle_id,
          bus_number: vehicle.bus_number,
          lat: vehicle.lat,
          lng: vehicle.lng,
          speed: 0,
          heading: vehicle.heading,
          status: vehicle.status,
          route_id: vehicle.route_id,
          driver_name: vehicle.driver_name,
          accuracy: vehicle.accuracy
        });
      } catch (error) {
        logger.warn('Failed to initialize vehicle position', { 
          vehicle_id: vehicle.vehicle_id, 
          error: error.message 
        });
      }
    }
    
    logger.info(`Initialized ${this.vehicles.length} vehicle positions`);
  }

  /**
   * Start the fleet simulation
   */
  start() {
    if (this.isRunning) {
      logger.warn('India Fleet Simulator is already running');
      return;
    }
    
    this.isRunning = true;
    logger.info('Starting India Fleet Simulator...');
    
    // Start the main update loop
    this.updateInterval = setInterval(() => {
      this.updateFleet();
    }, this.updateFrequency);
    
    // Start status variation loop (every 30 seconds)
    setInterval(() => {
      this.varyVehicleStatuses();
    }, 30000);
    
    logger.info(`India Fleet Simulator started with ${this.vehicles.length} vehicles`);
  }

  /**
   * Stop the fleet simulation
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('India Fleet Simulator is not running');
      return;
    }
    
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.info('India Fleet Simulator stopped');
  }

  /**
   * Update all vehicles in the fleet
   */
  async updateFleet() {
    const updatePromises = [];
    const batchSize = 50; // Process vehicles in batches to avoid overwhelming the system
    
    for (let i = 0; i < this.vehicles.length; i += batchSize) {
      const batch = this.vehicles.slice(i, i + batchSize);
      
      for (const vehicle of batch) {
        if (this.shouldUpdateVehicle(vehicle)) {
          updatePromises.push(this.updateVehicle(vehicle));
        }
      }
      
      // Process batch
      if (updatePromises.length >= batchSize) {
        await Promise.allSettled(updatePromises);
        updatePromises.length = 0; // Clear array
      }
    }
    
    // Process remaining updates
    if (updatePromises.length > 0) {
      await Promise.allSettled(updatePromises);
    }
  }

  /**
   * Check if vehicle should be updated based on its status and timing
   */
  shouldUpdateVehicle(vehicle) {
    const now = new Date();
    const timeSinceLastUpdate = now - vehicle.lastUpdate;
    
    // Different update frequencies based on status
    let requiredInterval = vehicle.updateInterval;
    
    switch (vehicle.status) {
      case 'live':
        requiredInterval = vehicle.updateInterval;
        break;
      case 'delayed':
        requiredInterval = vehicle.updateInterval * 2; // Update less frequently
        break;
      case 'offline':
        requiredInterval = vehicle.updateInterval * 10; // Very infrequent updates
        break;
    }
    
    return timeSinceLastUpdate >= requiredInterval;
  }

  /**
   * Update a single vehicle's position and status
   */
  async updateVehicle(vehicle) {
    try {
      // Skip offline vehicles most of the time
      if (vehicle.status === 'offline' && Math.random() > 0.1) {
        return;
      }
      
      // Move vehicle along route
      this.moveVehicleAlongRoute(vehicle);
      
      // Update vehicle status in database
      await vehicleStatusModel.upsertVehicle({
        vehicle_id: vehicle.vehicle_id,
        bus_number: vehicle.bus_number,
        lat: vehicle.lat,
        lng: vehicle.lng,
        speed: vehicle.currentSpeed,
        heading: vehicle.heading,
        status: vehicle.status,
        route_id: vehicle.route_id,
        driver_name: vehicle.driver_name,
        accuracy: vehicle.accuracy
      });
      
      vehicle.lastUpdate = new Date();
      
    } catch (error) {
      logger.warn('Failed to update vehicle', { 
        vehicle_id: vehicle.vehicle_id, 
        error: error.message 
      });
    }
  }

  /**
   * Move vehicle along its route polyline
   */
  moveVehicleAlongRoute(vehicle) {
    if (!vehicle.polyline || vehicle.polyline.length === 0) return;
    
    // Calculate speed variation based on status
    let speedMultiplier = 1;
    switch (vehicle.status) {
      case 'live':
        speedMultiplier = Math.random() * 0.4 + 0.8; // 80-120% of base speed
        break;
      case 'delayed':
        speedMultiplier = Math.random() * 0.3 + 0.4; // 40-70% of base speed
        break;
      case 'offline':
        speedMultiplier = 0; // No movement
        break;
    }
    
    vehicle.currentSpeed = vehicle.baseSpeed * speedMultiplier;
    
    if (vehicle.currentSpeed === 0) return;
    
    // Move to next point in route
    const moveDistance = (vehicle.currentSpeed / 3600) * (this.updateFrequency / 1000); // km moved in update interval
    const routeLength = vehicle.polyline.length;
    
    // Simple movement: advance index based on speed
    const indexIncrement = Math.max(1, Math.floor(moveDistance * 100)); // Rough approximation
    
    vehicle.currentIndex += vehicle.direction * indexIncrement;
    
    // Handle route boundaries
    if (vehicle.currentIndex >= routeLength) {
      vehicle.currentIndex = routeLength - 1;
      vehicle.direction = -1; // Reverse direction
    } else if (vehicle.currentIndex < 0) {
      vehicle.currentIndex = 0;
      vehicle.direction = 1; // Forward direction
    }
    
    // Update position
    const [lng, lat] = vehicle.polyline[vehicle.currentIndex];
    vehicle.lat = lat + (Math.random() - 0.5) * 0.0001; // Add small GPS noise
    vehicle.lng = lng + (Math.random() - 0.5) * 0.0001;
    
    // Update heading
    vehicle.heading = this.calculateHeading(vehicle);
    
    // Update accuracy based on network quality
    vehicle.accuracy = (1 - vehicle.networkQuality) * 20 + 5; // 5-25 meters
  }

  /**
   * Calculate vehicle heading based on movement direction
   */
  calculateHeading(vehicle) {
    if (!vehicle.polyline || vehicle.polyline.length < 2) return 0;
    
    const currentIdx = Math.max(0, Math.min(vehicle.currentIndex, vehicle.polyline.length - 1));
    const nextIdx = Math.max(0, Math.min(currentIdx + vehicle.direction, vehicle.polyline.length - 1));
    
    if (currentIdx === nextIdx) return vehicle.heading || 0;
    
    const [lng1, lat1] = vehicle.polyline[currentIdx];
    const [lng2, lat2] = vehicle.polyline[nextIdx];
    
    const dLng = lng2 - lng1;
    const dLat = lat2 - lat1;
    
    let heading = Math.atan2(dLng, dLat) * 180 / Math.PI;
    if (heading < 0) heading += 360;
    
    return Math.round(heading);
  }

  /**
   * Randomly vary vehicle statuses to simulate real-world conditions
   */
  varyVehicleStatuses() {
    const changeCount = Math.floor(this.vehicles.length * 0.05); // Change 5% of vehicles
    
    for (let i = 0; i < changeCount; i++) {
      const vehicle = this.vehicles[Math.floor(Math.random() * this.vehicles.length)];
      vehicle.status = this.getRandomStatus();
      
      // Adjust network quality based on status
      switch (vehicle.status) {
        case 'live':
          vehicle.networkQuality = Math.random() * 0.3 + 0.7; // 70-100%
          break;
        case 'delayed':
          vehicle.networkQuality = Math.random() * 0.4 + 0.4; // 40-80%
          break;
        case 'offline':
          vehicle.networkQuality = Math.random() * 0.3 + 0.1; // 10-40%
          break;
      }
    }
  }

  /**
   * Get random status based on distribution
   */
  getRandomStatus() {
    const rand = Math.random();
    
    if (rand < this.statusDistribution.live) {
      return 'live';
    } else if (rand < this.statusDistribution.live + this.statusDistribution.delayed) {
      return 'delayed';
    } else {
      return 'offline';
    }
  }

  /**
   * Generate random driver name
   */
  generateDriverName() {
    const firstNames = ['Raj', 'Amit', 'Suresh', 'Ravi', 'Vikram', 'Anil', 'Deepak', 'Manoj', 'Sanjay', 'Ramesh'];
    const lastNames = ['Kumar', 'Singh', 'Sharma', 'Gupta', 'Verma', 'Yadav', 'Mishra', 'Agarwal', 'Jain', 'Patel'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  /**
   * Generate random shift start time
   */
  generateShiftTime() {
    const shifts = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    return shifts[Math.floor(Math.random() * shifts.length)];
  }

  /**
   * Get simulation statistics
   */
  getStats() {
    const stats = {
      totalVehicles: this.vehicles.length,
      totalRoutes: this.routes.length,
      cities: Object.keys(INDIA_CITIES).length,
      isRunning: this.isRunning,
      statusBreakdown: {
        live: 0,
        delayed: 0,
        offline: 0
      },
      cityBreakdown: {}
    };
    
    // Calculate status breakdown
    for (const vehicle of this.vehicles) {
      stats.statusBreakdown[vehicle.status]++;
      
      if (!stats.cityBreakdown[vehicle.city]) {
        stats.cityBreakdown[vehicle.city] = 0;
      }
      stats.cityBreakdown[vehicle.city]++;
    }
    
    return stats;
  }

  /**
   * Get vehicles for a specific city
   */
  getVehiclesByCity(cityKey) {
    return this.vehicles.filter(vehicle => vehicle.city === cityKey);
  }

  /**
   * Get routes for a specific city
   */
  getRoutesByCity(cityKey) {
    return this.routes.filter(route => route.city === cityKey);
  }
}

module.exports = IndiaFleetSimulator;