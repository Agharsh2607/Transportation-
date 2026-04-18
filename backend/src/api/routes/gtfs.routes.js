const express = require('express');
const gtfsController = require('../controllers/gtfs.controller');

const router = express.Router();

/**
 * POST /api/gtfs/load
 * Load GTFS data from a directory
 */
router.post('/load', (req, res) => gtfsController.loadGTFS(req, res));

/**
 * GET /api/gtfs/routes
 * Get all routes
 */
router.get('/routes', (req, res) => gtfsController.getRoutes(req, res));

/**
 * GET /api/gtfs/stops
 * Get all stops
 */
router.get('/stops', (req, res) => gtfsController.getStops(req, res));

/**
 * GET /api/gtfs/routes/:routeId
 * Get route with stops
 */
router.get('/routes/:routeId', (req, res) => gtfsController.getRouteStops(req, res));

module.exports = router;
