const routeModel = require('../models/route.model');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');
const predefinedRoutes = require('../data/routes.data');

/**
 * Get all active routes (from DB or predefined data).
 */
async function getAllRoutes() {
  try {
    // Try to get from database first
    const dbRoutes = await routeModel.findAll();
    if (dbRoutes && dbRoutes.length > 0) {
      return dbRoutes;
    }
    // Fall back to predefined routes
    return predefinedRoutes;
  } catch (err) {
    logger.warn('route.service.getAllRoutes DB error, using predefined routes', { message: err.message });
    return predefinedRoutes;
  }
}

/**
 * Get a single route by ID (includes stops array).
 * @param {string} id
 */
async function getRouteById(id) {
  try {
    // Try database first
    const dbRoute = await routeModel.findById(id);
    if (dbRoute) {
      return dbRoute;
    }
  } catch (err) {
    logger.warn('route.service.getRouteById DB error', { id, message: err.message });
  }

  // Fall back to predefined routes
  const predefinedRoute = predefinedRoutes.find((r) => r.id === id);
  if (predefinedRoute) {
    return predefinedRoute;
  }

  throw new Error(`Route ${id} not found`);
}

/**
 * Get a route with its live vehicle states from Redis.
 * @param {string} id
 */
async function getRouteWithVehicles(id) {
  try {
    const route = await routeModel.findById(id);
    if (!route) return null;

    const vehicleIds = await cacheService.getRouteVehicles(id);
    const vehicleStates = await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        const state = await cacheService.getVehicleState(vehicleId);
        return state ? { vehicle_id: vehicleId, ...state } : { vehicle_id: vehicleId, status: 'offline' };
      })
    );

    return { ...route, live_vehicles: vehicleStates };
  } catch (err) {
    logger.error('route.service.getRouteWithVehicles error', { id, message: err.message });
    throw err;
  }
}

/**
 * Get all stops for a route in sequence order.
 * @param {string} routeId
 */
async function getStopsForRoute(routeId) {
  try {
    return await routeModel.getStopsForRoute(routeId);
  } catch (err) {
    logger.error('route.service.getStopsForRoute error', { routeId, message: err.message });
    throw err;
  }
}

module.exports = { getAllRoutes, getRouteById, getRouteWithVehicles, getStopsForRoute };
