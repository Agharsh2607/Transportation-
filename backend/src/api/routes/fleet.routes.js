const express = require('express');
const fleetController = require('../controllers/fleet.controller');

const router = express.Router();

/**
 * POST /api/fleet/initialize
 * Initialize the India fleet simulation
 */
router.post('/initialize', (req, res) => fleetController.initializeFleet(req, res));

/**
 * POST /api/fleet/start
 * Start the fleet simulation
 */
router.post('/start', (req, res) => fleetController.startFleet(req, res));

/**
 * POST /api/fleet/stop
 * Stop the fleet simulation
 */
router.post('/stop', (req, res) => fleetController.stopFleet(req, res));

/**
 * POST /api/fleet/reset
 * Reset the entire fleet simulation
 */
router.post('/reset', (req, res) => fleetController.resetFleet(req, res));

/**
 * GET /api/fleet/status
 * Get fleet simulation status and statistics
 */
router.get('/status', (req, res) => fleetController.getFleetStatus(req, res));

/**
 * GET /api/fleet/vehicles
 * Get all active vehicles
 */
router.get('/vehicles', (req, res) => fleetController.getAllVehicles(req, res));

/**
 * GET /api/fleet/vehicles/bounds
 * Get vehicles within specific bounds (for map viewport)
 */
router.get('/vehicles/bounds', (req, res) => fleetController.getVehiclesInBounds(req, res));

/**
 * GET /api/fleet/cities
 * Get all cities in the simulation
 */
router.get('/cities', (req, res) => fleetController.getCities(req, res));

/**
 * GET /api/fleet/cities/:city/vehicles
 * Get vehicles for a specific city
 */
router.get('/cities/:city/vehicles', (req, res) => fleetController.getVehiclesByCity(req, res));

/**
 * GET /api/fleet/cities/:city/routes
 * Get routes for a specific city
 */
router.get('/cities/:city/routes', (req, res) => fleetController.getCityRoutes(req, res));

module.exports = router;