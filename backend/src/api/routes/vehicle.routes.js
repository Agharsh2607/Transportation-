const { Router } = require('express');
const { validate } = require('../../middleware/validate.middleware');
const { createVehicleSchema } = require('../validators/vehicle.validator');
const vehicleController = require('../controllers/vehicle.controller');

const router = Router();

// GET /vehicles
router.get('/vehicles', vehicleController.getAll);

// GET /vehicles/route/:routeId  — must come before /:id to avoid conflict
router.get('/vehicles/route/:routeId', vehicleController.getByRoute);

// GET /vehicles/:id
router.get('/vehicles/:id', vehicleController.getById);

// POST /vehicles
router.post('/vehicles', validate(createVehicleSchema), vehicleController.create);

// PATCH /vehicles/:id/status
router.patch('/vehicles/:id/status', vehicleController.updateStatus);

module.exports = router;
