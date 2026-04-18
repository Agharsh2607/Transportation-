const { query } = require('../config/db.config');
const logger = require('../utils/logger');

/**
 * Fetch all vehicles joined with their route name.
 */
async function findAll() {
  try {
    const result = await query(
      `SELECT v.*, r.name AS route_name
       FROM vehicles v
       LEFT JOIN routes r ON v.route_id = r.id
       ORDER BY v.id`,
      []
    );
    return result.rows;
  } catch (err) {
    logger.error('vehicle.model.findAll error', { message: err.message });
    throw err;
  }
}

/**
 * Find a single vehicle by ID, joined with route name.
 * @param {string} id
 */
async function findById(id) {
  try {
    const result = await query(
      `SELECT v.*, r.name AS route_name
       FROM vehicles v
       LEFT JOIN routes r ON v.route_id = r.id
       WHERE v.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error('vehicle.model.findById error', { id, message: err.message });
    throw err;
  }
}

/**
 * Find all vehicles assigned to a specific route.
 * @param {string} routeId
 */
async function findByRouteId(routeId) {
  try {
    const result = await query(
      `SELECT v.*, r.name AS route_name
       FROM vehicles v
       LEFT JOIN routes r ON v.route_id = r.id
       WHERE v.route_id = $1
       ORDER BY v.id`,
      [routeId]
    );
    return result.rows;
  } catch (err) {
    logger.error('vehicle.model.findByRouteId error', { routeId, message: err.message });
    throw err;
  }
}

/**
 * Insert a new vehicle record.
 * @param {{ id: string, registration_number: string, model: string, capacity: number, route_id: string, driver_name: string }} data
 */
async function create(data) {
  const { id, registration_number, model, capacity, route_id, driver_name } = data;
  try {
    const result = await query(
      `INSERT INTO vehicles (id, registration_number, model, capacity, route_id, driver_name, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
       RETURNING *`,
      [id, registration_number, model, capacity, route_id, driver_name]
    );
    return result.rows[0];
  } catch (err) {
    logger.error('vehicle.model.create error', { message: err.message });
    throw err;
  }
}

/**
 * Update the operational status of a vehicle.
 * @param {string} id
 * @param {string} status
 */
async function updateStatus(id, status) {
  try {
    const result = await query(
      `UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error('vehicle.model.updateStatus error', { id, message: err.message });
    throw err;
  }
}

/**
 * Reassign a vehicle to a different route.
 * @param {string} id
 * @param {string} routeId
 */
async function updateRoute(id, routeId) {
  try {
    const result = await query(
      `UPDATE vehicles SET route_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [routeId, id]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error('vehicle.model.updateRoute error', { id, message: err.message });
    throw err;
  }
}

module.exports = { findAll, findById, findByRouteId, create, updateStatus, updateRoute };
