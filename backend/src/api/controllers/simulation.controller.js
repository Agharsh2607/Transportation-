/**
 * Simulation Controller - Manages GPS simulation for demo/testing
 */

const logger = require('../../utils/logger');

class SimulationController {
  constructor(gpsSimulator, vehicleService, routeService) {
    this.gpsSimulator = gpsSimulator;
    this.vehicleService = vehicleService;
    this.routeService = routeService;
  }

  /**
   * Start GPS simulation for a vehicle
   * POST /api/simulation/start
   */
  async startSimulation(req, res) {
    try {
      const { vehicleId, routeId } = req.body;

      if (!vehicleId || !routeId) {
        return res.status(400).json({
          error: 'vehicleId and routeId are required',
        });
      }

      // Get route data
      const route = await this.routeService.getRouteById(routeId);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      // Start simulation
      this.gpsSimulator.startVehicleSimulation(vehicleId, routeId, route.polyline);

      res.json({
        success: true,
        message: `GPS simulation started for vehicle ${vehicleId}`,
        vehicleId,
        routeId,
      });
    } catch (err) {
      logger.error('Error starting simulation', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Stop GPS simulation for a vehicle
   * POST /api/simulation/stop
   */
  async stopSimulation(req, res) {
    try {
      const { vehicleId } = req.body;

      if (!vehicleId) {
        return res.status(400).json({ error: 'vehicleId is required' });
      }

      this.gpsSimulator.stopVehicleSimulation(vehicleId);

      res.json({
        success: true,
        message: `GPS simulation stopped for vehicle ${vehicleId}`,
      });
    } catch (err) {
      logger.error('Error stopping simulation', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get simulation status
   * GET /api/simulation/status
   */
  async getStatus(req, res) {
    try {
      const activeCount = this.gpsSimulator.getActiveVehicleCount();

      res.json({
        isRunning: this.gpsSimulator.isRunning,
        activeVehicles: activeCount,
      });
    } catch (err) {
      logger.error('Error getting simulation status', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get all available routes
   * GET /api/simulation/routes
   */
  async getRoutes(req, res) {
    try {
      const routes = await this.routeService.getAllRoutes();
      res.json(routes);
    } catch (err) {
      logger.error('Error getting routes', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get live vehicle data
   * GET /api/simulation/vehicles
   */
  async getVehicles(req, res) {
    try {
      const vehicles = await this.vehicleService.getAllVehicles();
      res.json(vehicles);
    } catch (err) {
      logger.error('Error getting vehicles', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = SimulationController;
