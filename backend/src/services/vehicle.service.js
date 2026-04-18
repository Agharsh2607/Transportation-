const vehicleModel = require('../models/vehicle.model');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

/**
 * Get all vehicles from the database.
 */
async function getAllVehicles() {
  try {
    return await vehicleModel.findAll();
  } catch (err) {
    logger.error('vehicle.service.getAllVehicles error', { message: err.message });
    throw err;
  }
}

/**
 * Get a single vehicle by ID, merging DB record with live Redis state.
 * @param {string} id
 */
async function getVehicleById(id) {
  try {
    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) return null;

    const liveState = await cacheService.getVehicleState(id);
    if (liveState) {
      return {
        ...vehicle,
        live: {
          lat: parseFloat(liveState.lat) || null,
          lng: parseFloat(liveState.lng) || null,
          speed_kmh: parseFloat(liveState.speed_kmh) || null,
          heading: parseFloat(liveState.heading) || null,
          signal_strength: liveState.signal_strength || null,
          eta_next_stop: liveState.eta_next_stop ? parseInt(liveState.eta_next_stop, 10) : null,
          eta_next_stop_name: liveState.eta_next_stop_name || null,
          last_seen: liveState.last_seen || null,
          status: liveState.status || 'unknown',
        },
      };
    }

    return { ...vehicle, live: null };
  } catch (err) {
    logger.error('vehicle.service.getVehicleById error', { id, message: err.message });
    throw err;
  }
}

/**
 * Get all vehicles assigned to a route.
 * @param {string} routeId
 */
async function getVehiclesByRoute(routeId) {
  try {
    return await vehicleModel.findByRouteId(routeId);
  } catch (err) {
    logger.error('vehicle.service.getVehiclesByRoute error', { routeId, message: err.message });
    throw err;
  }
}

/**
 * Register a new vehicle and add it to the Redis route set.
 * @param {object} data
 */
async function registerVehicle(data) {
  try {
    const vehicle = await vehicleModel.create(data);
    if (vehicle.route_id) {
      await cacheService.addVehicleToRoute(vehicle.route_id, vehicle.id);
    }
    return vehicle;
  } catch (err) {
    logger.error('vehicle.service.registerVehicle error', { message: err.message });
    throw err;
  }
}

/**
 * Update a vehicle's operational status in both DB and Redis.
 * @param {string} id
 * @param {string} status
 */
async function updateVehicleStatus(id, status) {
  try {
    const vehicle = await vehicleModel.updateStatus(id, status);
    if (vehicle) {
      await cacheService.setVehicleState(id, { status });
    }
    return vehicle;
  } catch (err) {
    logger.error('vehicle.service.updateVehicleStatus error', { id, message: err.message });
    throw err;
  }
}

module.exports = {
  getAllVehicles,
  getVehicleById,
  getVehiclesByRoute,
  registerVehicle,
  updateVehicleStatus,
};
