const { Router } = require('express');
const routeController = require('../controllers/route.controller');

const router = Router();

// GET /routes
router.get('/routes', routeController.getAll);

// GET /routes/:id
router.get('/routes/:id', routeController.getById);

// GET /routes/:id/vehicles
router.get('/routes/:id/vehicles', routeController.getWithVehicles);

// GET /routes/:id/stops
router.get('/routes/:id/stops', routeController.getStops);

module.exports = router;
