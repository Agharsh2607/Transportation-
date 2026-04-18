const { redisCache } = require('../config/redis.config');
const logger = require('../utils/logger');

const VEHICLE_STATE_TTL = 30;       // seconds
const STOP_ETA_TTL = 15;            // seconds
const SEQ_SET_TTL = 3600;           // 1 hour

/**
 * Store all fields of a vehicle's live state in a Redis hash.
 * TTL is 30 seconds — if no ping arrives, the state expires.
 * @param {string} vehicleId
 * @param {object} stateObj
 */
async function setVehicleState(vehicleId, stateObj) {
  const key = `vehicle:${vehicleId}:state`;
  try {
    const flat = {};
    for (const [k, v] of Object.entries(stateObj)) {
      flat[k] = v !== null && v !== undefined ? String(v) : '';
    }
    await redisCache.hset(key, flat);
    await redisCache.expire(key, VEHICLE_STATE_TTL);
  } catch (err) {
    logger.error('cache.setVehicleState error', { vehicleId, message: err.message });
  }
}

/**
 * Retrieve all fields of a vehicle's live state.
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
async function getVehicleState(vehicleId) {
  const key = `vehicle:${vehicleId}:state`;
  try {
    const data = await redisCache.hgetall(key);
    return data && Object.keys(data).length > 0 ? data : null;
  } catch (err) {
    logger.error('cache.getVehicleState error', { vehicleId, message: err.message });
    return null;
  }
}

/**
 * Add a vehicle to the set of vehicles currently on a route.
 * @param {string} routeId
 * @param {string} vehicleId
 */
async function addVehicleToRoute(routeId, vehicleId) {
  const key = `route:${routeId}:vehicles`;
  try {
    await redisCache.sadd(key, vehicleId);
  } catch (err) {
    logger.error('cache.addVehicleToRoute error', { routeId, vehicleId, message: err.message });
  }
}

/**
 * Get all vehicle IDs currently on a route.
 * @param {string} routeId
 * @returns {Promise<string[]>}
 */
async function getRouteVehicles(routeId) {
  const key = `route:${routeId}:vehicles`;
  try {
    return await redisCache.smembers(key);
  } catch (err) {
    logger.error('cache.getRouteVehicles error', { routeId, message: err.message });
    return [];
  }
}

/**
 * Store the ETA prediction for a specific vehicle approaching a stop.
 * @param {string} routeId
 * @param {string} stopId
 * @param {string} vehicleId
 * @param {number} etaMin
 */
async function setStopETA(routeId, stopId, vehicleId, etaMin) {
  const key = `route:${routeId}:stop:${stopId}:eta`;
  try {
    await redisCache.hset(key, vehicleId, String(etaMin));
    await redisCache.expire(key, STOP_ETA_TTL);
  } catch (err) {
    logger.error('cache.setStopETA error', { routeId, stopId, message: err.message });
  }
}

/**
 * Get all ETA predictions for a stop (keyed by vehicle ID).
 * @param {string} routeId
 * @param {string} stopId
 * @returns {Promise<object>}
 */
async function getStopETA(routeId, stopId) {
  const key = `route:${routeId}:stop:${stopId}:eta`;
  try {
    return await redisCache.hgetall(key) || {};
  } catch (err) {
    logger.error('cache.getStopETA error', { routeId, stopId, message: err.message });
    return {};
  }
}

/**
 * Add or update a vehicle in the active vehicles sorted set.
 * Score is the Unix timestamp of the last ping.
 * @param {string} vehicleId
 * @param {string} timestamp - ISO timestamp
 */
async function updateActiveVehicles(vehicleId, timestamp) {
  const key = 'vehicles:active';
  try {
    const score = new Date(timestamp).getTime() / 1000;
    await redisCache.zadd(key, score, vehicleId);
  } catch (err) {
    logger.error('cache.updateActiveVehicles error', { vehicleId, message: err.message });
  }
}

/**
 * Count vehicles that have sent a ping within the last N seconds.
 * @param {number} windowSeconds
 * @returns {Promise<number>}
 */
async function getActiveVehicleCount(windowSeconds) {
  const key = 'vehicles:active';
  try {
    const minScore = (Date.now() / 1000) - windowSeconds;
    return await redisCache.zcount(key, minScore, '+inf');
  } catch (err) {
    logger.error('cache.getActiveVehicleCount error', { message: err.message });
    return 0;
  }
}

/**
 * Store the offline buffer packet count for a vehicle.
 * @param {string} vehicleId
 * @param {number} count
 */
async function setBufferCount(vehicleId, count) {
  const key = `vehicle:${vehicleId}:buffer_count`;
  try {
    await redisCache.set(key, String(count), 'EX', 3600);
  } catch (err) {
    logger.error('cache.setBufferCount error', { vehicleId, message: err.message });
  }
}

/**
 * Get the offline buffer packet count for a vehicle.
 * @param {string} vehicleId
 * @returns {Promise<number>}
 */
async function getBufferCount(vehicleId) {
  const key = `vehicle:${vehicleId}:buffer_count`;
  try {
    const val = await redisCache.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch (err) {
    logger.error('cache.getBufferCount error', { vehicleId, message: err.message });
    return 0;
  }
}

/**
 * Check if a sequence number has already been processed for a vehicle.
 * Uses a Redis Set with a 1-hour TTL to track seen sequence numbers.
 * SADD returns 0 if the member already exists (duplicate).
 * @param {string} vehicleId
 * @param {number} seq
 * @returns {Promise<boolean>} true if duplicate
 */
async function isDuplicateSeq(vehicleId, seq) {
  const key = `vehicle:${vehicleId}:seqs`;
  try {
    const added = await redisCache.sadd(key, String(seq));
    // Set TTL on every operation to keep the window sliding
    await redisCache.expire(key, SEQ_SET_TTL);
    // SADD returns 1 if new, 0 if already existed
    return added === 0;
  } catch (err) {
    logger.error('cache.isDuplicateSeq error', { vehicleId, seq, message: err.message });
    return false; // On error, allow the packet through
  }
}

/**
 * Publish a message to a Redis Pub/Sub channel.
 * @param {string} channel
 * @param {object} data
 */
async function publishUpdate(channel, data) {
  try {
    await redisCache.publish(channel, JSON.stringify(data));
  } catch (err) {
    logger.error('cache.publishUpdate error', { channel, message: err.message });
  }
}

module.exports = {
  setVehicleState,
  getVehicleState,
  addVehicleToRoute,
  getRouteVehicles,
  setStopETA,
  getStopETA,
  updateActiveVehicles,
  getActiveVehicleCount,
  setBufferCount,
  getBufferCount,
  isDuplicateSeq,
  publishUpdate,
};
