/**
 * Transit Routes - Real transit data from SkedGo API
 */

const { Router } = require('express');
const TransitController = require('../controllers/transit.controller');

const router = Router();
const controller = new TransitController();

// Search for locations
router.get('/transit/search', (req, res) => controller.searchLocations(req, res));

// Get routes between two locations
router.get('/transit/routes', (req, res) => controller.getRoutes(req, res));

// Get vehicle positions for a route
router.get('/transit/vehicles', (req, res) => controller.getVehiclePositions(req, res));

// Get transit agencies in an area
router.get('/transit/agencies', (req, res) => controller.getAgencies(req, res));

// Get stops for a route
router.get('/transit/stops', (req, res) => controller.getStops(req, res));

module.exports = router;
