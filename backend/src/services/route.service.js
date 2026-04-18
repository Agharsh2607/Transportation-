const routeModel = require('../models/route.model');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

/**
 * Get all active routes.
 */
async function getAllRoutes() {
  try {
    return await routeModel.findAll();
  } catch (err) {
    logger.error('route.service.getAllRoutes error', { message: err.message });
    throw err;
  }
}

/**
 * Get a single route by ID (includes stops array).
 * @param {string} id
 */
async function getRouteById(id) {
  try {
    return await routeModel.findById(id);
  } catch (err) {
    logger.error('route.service.getRouteById error', { id, message: err.message });
    throw err;
  }
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
