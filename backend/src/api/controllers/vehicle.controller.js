const vehicleService = require('../../services/vehicle.service');
const logger = require('../../utils/logger');

/**
 * GET /api/vehicles
 */
async function getAll(req, res, next) {
  try {
    const vehicles = await vehicleService.getAllVehicles();
    res.json({ data: vehicles, count: vehicles.length });
  } catch (err) {
    logger.error('vehicle.controller.getAll error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/vehicles/:id
 */
async function getById(req, res, next) {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found', code: 404 });
    }
    res.json({ data: vehicle });
  } catch (err) {
    logger.error('vehicle.controller.getById error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/vehicles/route/:routeId
 */
async function getByRoute(req, res, next) {
  try {
    const vehicles = await vehicleService.getVehiclesByRoute(req.params.routeId);
    res.json({ data: vehicles, count: vehicles.length });
  } catch (err) {
    logger.error('vehicle.controller.getByRoute error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/vehicles
 */
async function create(req, res, next) {
  try {
    const vehicle = await vehicleService.registerVehicle(req.body);
    res.status(201).json({ data: vehicle });
  } catch (err) {
    logger.error('vehicle.controller.create error', { message: err.message });
    next(err);
  }
}

/**
 * PATCH /api/vehicles/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status field is required', code: 400 });
    }
    const vehicle = await vehicleService.updateVehicleStatus(req.params.id, status);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found', code: 404 });
    }
    res.json({ data: vehicle });
  } catch (err) {
    logger.error('vehicle.controller.updateStatus error', { message: err.message });
    next(err);
  }
}

module.exports = { getAll, getById, getByRoute, create, updateStatus };
