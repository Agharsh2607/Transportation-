const IndiaFleetSimulator = require('../../services/india.fleet.simulator');
const { INDIA_CITIES } = require('../../data/india.cities.data');
const vehicleStatusModel = require('../../models/vehicleStatus.model');
const logger = require('../../utils/logger');

// Global fleet simulator instance
let fleetSimulator = null;

class FleetController {
  /**
   * Initialize the fleet simulation
   */
  async initializeFleet(req, res) {
    try {
      if (fleetSimulator && fleetSimulator.isRunning) {
        return res.json({
          success: true,
          message: 'Fleet simulation is already running',
          stats: fleetSimulator.getStats()
        });
      }

      logger.info('Initializing India Fleet Simulation...');
      
      fleetSimulator = new IndiaFleetSimulator();
      await fleetSimulator.initialize();
      
      res.json({
        success: true,
        message: 'Fleet simulation initialized successfully',
        stats: fleetSimulator.getStats()
      });
    } catch (error) {
      logger.error('Failed to initialize fleet simulation', { error: error.message });
      res.status(500).json({
        error: 'Failed to initialize fleet',
        message: error.message
      });
    }
  }

  /**
   * Start the fleet simulation
   */
  async startFleet(req, res) {
    try {
      if (!fleetSimulator) {
        return res.status(400).json({
          error: 'Fleet not initialized',
          message: 'Please initialize the fleet first'
        });
      }

      if (fleetSimulator.isRunning) {
        return res.json({
          success: true,
          message: 'Fleet simulation is already running',
          stats: fleetSimulator.getStats()
        });
      }

      fleetSimulator.start();
      
      res.json({
        success: true,
        message: 'Fleet simulation started successfully',
        stats: fleetSimulator.getStats()
      });
    } catch (error) {
      logger.error('Failed to start fleet simulation', { error: error.message });
      res.status(500).json({
        error: 'Failed to start fleet',
        message: error.message
      });
    }
  }

  /**
   * Stop the fleet simulation
   */
  async stopFleet(req, res) {
    try {
      if (!fleetSimulator) {
        return res.status(400).json({
          error: 'Fleet not initialized',
          message: 'No fleet simulation to stop'
        });
      }

      fleetSimulator.stop();
      
      res.json({
        success: true,
        message: 'Fleet simulation stopped successfully',
        stats: fleetSimulator.getStats()
      });
    } catch (error) {
      logger.error('Failed to stop fleet simulation', { error: error.message });
      res.status(500).json({
        error: 'Failed to stop fleet',
        message: error.message
      });
    }
  }

  /**
   * Get fleet simulation status and statistics
   */
  async getFleetStatus(req, res) {
    try {
      if (!fleetSimulator) {
        return res.json({
          success: true,
          initialized: false,
          running: false,
          message: 'Fleet simulation not initialized'
        });
      }

      const stats = fleetSimulator.getStats();
      
      res.json({
        success: true,
        initialized: true,
        running: fleetSimulator.isRunning,
        stats: stats,
        cities: INDIA_CITIES
      });
    } catch (error) {
      logger.error('Failed to get fleet status', { error: error.message });
      res.status(500).json({
        error: 'Failed to get fleet status',
        message: error.message
      });
    }
  }

  /**
   * Get all active vehicles (from database)
   */
  async getAllVehicles(req, res) {
    try {
      const vehicles = await vehicleStatusModel.getAllActiveVehicles();
      
      res.json({
        success: true,
        vehicles: vehicles,
        count: vehicles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get all vehicles', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicles',
        message: error.message
      });
    }
  }

  /**
   * Get vehicles by city
   */
  async getVehiclesByCity(req, res) {
    try {
      const { city } = req.params;
      
      if (!INDIA_CITIES[city]) {
        return res.status(400).json({
          error: 'Invalid city',
          message: 'City not found in simulation'
        });
      }

      // Get all vehicles and filter by city (route_id contains city prefix)
      const allVehicles = await vehicleStatusModel.getAllActiveVehicles();
      const cityVehicles = allVehicles.filter(vehicle => 
        vehicle.route_id && vehicle.route_id.startsWith(city.toUpperCase())
      );
      
      res.json({
        success: true,
        city: city,
        city_name: INDIA_CITIES[city].name,
        vehicles: cityVehicles,
        count: cityVehicles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get vehicles by city', { error: error.message, city: req.params.city });
      res.status(500).json({
        error: 'Failed to get vehicles by city',
        message: error.message
      });
    }
  }

  /**
   * Get routes for a specific city
   */
  async getCityRoutes(req, res) {
    try {
      const { city } = req.params;
      
      if (!INDIA_CITIES[city]) {
        return res.status(400).json({
          error: 'Invalid city',
          message: 'City not found in simulation'
        });
      }

      if (!fleetSimulator) {
        return res.status(400).json({
          error: 'Fleet not initialized',
          message: 'Please initialize the fleet first'
        });
      }

      const routes = fleetSimulator.getRoutesByCity(city);
      
      res.json({
        success: true,
        city: city,
        city_name: INDIA_CITIES[city].name,
        routes: routes,
        count: routes.length
      });
    } catch (error) {
      logger.error('Failed to get city routes', { error: error.message, city: req.params.city });
      res.status(500).json({
        error: 'Failed to get city routes',
        message: error.message
      });
    }
  }

  /**
   * Get all cities with their basic info
   */
  async getCities(req, res) {
    try {
      const cities = Object.entries(INDIA_CITIES).map(([key, data]) => ({
        key: key,
        name: data.name,
        center: data.center,
        bounds: data.bounds,
        population: data.population,
        busCount: data.busCount
      }));
      
      res.json({
        success: true,
        cities: cities,
        count: cities.length
      });
    } catch (error) {
      logger.error('Failed to get cities', { error: error.message });
      res.status(500).json({
        error: 'Failed to get cities',
        message: error.message
      });
    }
  }

  /**
   * Get vehicles in a specific bounding box (for map viewport)
   */
  async getVehiclesInBounds(req, res) {
    try {
      const { north, south, east, west } = req.query;
      
      if (!north || !south || !east || !west) {
        return res.status(400).json({
          error: 'Missing bounds parameters',
          message: 'Please provide north, south, east, west parameters'
        });
      }

      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      };

      // Get all vehicles and filter by bounds
      const allVehicles = await vehicleStatusModel.getAllActiveVehicles();
      const vehiclesInBounds = allVehicles.filter(vehicle => {
        const lat = parseFloat(vehicle.lat);
        const lng = parseFloat(vehicle.lng);
        
        return lat >= bounds.south && lat <= bounds.north &&
               lng >= bounds.west && lng <= bounds.east;
      });
      
      res.json({
        success: true,
        bounds: bounds,
        vehicles: vehiclesInBounds,
        count: vehiclesInBounds.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get vehicles in bounds', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicles in bounds',
        message: error.message
      });
    }
  }

  /**
   * Reset the entire fleet simulation
   */
  async resetFleet(req, res) {
    try {
      if (fleetSimulator) {
        fleetSimulator.stop();
        fleetSimulator = null;
      }

      // Clean up old vehicle data
      await vehicleStatusModel.cleanupOldVehicles();
      
      res.json({
        success: true,
        message: 'Fleet simulation reset successfully'
      });
    } catch (error) {
      logger.error('Failed to reset fleet simulation', { error: error.message });
      res.status(500).json({
        error: 'Failed to reset fleet',
        message: error.message
      });
    }
  }
}

module.exports = new FleetController();