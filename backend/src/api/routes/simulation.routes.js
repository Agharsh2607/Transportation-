/**
 * Simulation Routes - GPS simulation and live vehicle data
 */

const { Router } = require('express');

const router = Router();

/**
 * Factory function to create simulation routes with injected dependencies
 */
function createSimulationRoutes(gpsSimulator, vehicleService, routeService) {
  const SimulationController = require('../controllers/simulation.controller');
  const controller = new SimulationController(gpsSimulator, vehicleService, routeService);

  // Start GPS simulation for a vehicle
  router.post('/simulation/start', (req, res) => controller.startSimulation(req, res));

  // Stop GPS simulation for a vehicle
  router.post('/simulation/stop', (req, res) => controller.stopSimulation(req, res));

  // Get simulation status
  router.get('/simulation/status', (req, res) => controller.getStatus(req, res));

  // Get all available routes
  router.get('/simulation/routes', (req, res) => controller.getRoutes(req, res));

  // Get live vehicle data
  router.get('/simulation/vehicles', (req, res) => controller.getVehicles(req, res));

  return router;
}

module.exports = createSimulationRoutes;
