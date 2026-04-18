const routeService = require('../../services/route.service');
const logger = require('../../utils/logger');

/**
 * GET /api/routes
 */
async function getAll(req, res, next) {
  try {
    const routes = await routeService.getAllRoutes();
    res.json({ data: routes, count: routes.length });
  } catch (err) {
    logger.error('route.controller.getAll error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/routes/:id
 */
async function getById(req, res, next) {
  try {
    const route = await routeService.getRouteById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found', code: 404 });
    }
    res.json({ data: route });
  } catch (err) {
    logger.error('route.controller.getById error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/routes/:id/vehicles
 */
async function getWithVehicles(req, res, next) {
  try {
    const route = await routeService.getRouteWithVehicles(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found', code: 404 });
    }
    res.json({ data: route });
  } catch (err) {
    logger.error('route.controller.getWithVehicles error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/routes/:id/stops
 */
async function getStops(req, res, next) {
  try {
    const stops = await routeService.getStopsForRoute(req.params.id);
    res.json({ data: stops, count: stops.length });
  } catch (err) {
    logger.error('route.controller.getStops error', { message: err.message });
    next(err);
  }
}

module.exports = { getAll, getById, getWithVehicles, getStops };
