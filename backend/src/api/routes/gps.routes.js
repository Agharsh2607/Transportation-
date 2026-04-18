const express = require('express');
const gpsController = require('../controllers/gps.controller');

const router = express.Router();

/**
 * POST /api/gps/update
 * Receive GPS update from driver app
 */
router.post('/update', (req, res) => gpsController.receiveGPSUpdate(req, res));

/**
 * GET /api/gps/vehicle/:vehicleId
 * Get latest position for a vehicle
 */
router.get('/vehicle/:vehicleId', (req, res) => gpsController.getVehiclePosition(req, res));

/**
 * GET /api/gps/vehicles
 * Get all active vehicles
 */
router.get('/vehicles', (req, res) => gpsController.getAllVehicles(req, res));

module.exports = router;
