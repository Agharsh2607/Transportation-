const express = require('express');
const liveTrackingController = require('../controllers/liveTracking.controller');

const router = express.Router();

/**
 * POST /api/live/start
 * Start tracking - receive GPS position
 */
router.post('/start', (req, res) => liveTrackingController.startTracking(req, res));

/**
 * POST /api/live/stop
 * Stop tracking - mark vehicle offline
 */
router.post('/stop', (req, res) => liveTrackingController.stopTracking(req, res));

/**
 * GET /api/live/vehicles
 * Get all active vehicles.
 * Supports optional bbox query: ?bbox=minLat,minLng,maxLat,maxLng
 */
router.get('/vehicles', (req, res) => liveTrackingController.getActiveVehicles(req, res));

/**
 * GET /api/live/vehicle/:vehicleId
 * Get specific vehicle
 */
router.get('/vehicle/:vehicleId', (req, res) => liveTrackingController.getVehicle(req, res));

module.exports = router;