const { query } = require('../config/db.config');
const logger = require('../utils/logger');

/**
 * Fetch all active routes.
 */
async function findAll() {
  try {
    const result = await query(
      `SELECT * FROM routes WHERE active = true ORDER BY name`,
      []
    );
    return result.rows;
  } catch (err) {
    logger.error('route.model.findAll error', { message: err.message });
    throw err;
  }
}

/**
 * Find a route by ID, including its ordered stops as a JSON array.
 * @param {string} id
 */
async function findById(id) {
  try {
    const routeResult = await query(
      `SELECT * FROM routes WHERE id = $1`,
      [id]
    );
    if (!routeResult.rows[0]) return null;

    const route = routeResult.rows[0];
    const stops = await getStopsForRoute(id);
    route.stops = stops;
    return route;
  } catch (err) {
    logger.error('route.model.findById error', { id, message: err.message });
    throw err;
  }
}

/**
 * Get all stops for a route in sequence order via the route_stops join table.
 * @param {string} routeId
 */
async function getStopsForRoute(routeId) {
  try {
    const result = await query(
      `SELECT s.*, rs.stop_order, rs.distance_from_prev_km
       FROM stops s
       JOIN route_stops rs ON s.id = rs.stop_id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order ASC`,
      [routeId]
    );
    return result.rows;
  } catch (err) {
    logger.error('route.model.getStopsForRoute error', { routeId, message: err.message });
    throw err;
  }
}

/**
 * Insert a new route (for GTFS loading)
 * @param {object} routeData
 */
async function insert(routeData) {
  try {
    const {
      route_id,
      route_name,
      route_short_name,
      agency_id,
      polyline,
      route_color,
      route_type,
    } = routeData;

    const result = await query(
      `INSERT INTO routes (id, name, short_name, agency_id, polyline, color, route_type, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         short_name = $3,
         agency_id = $4,
         polyline = $5,
         color = $6,
         route_type = $7
       RETURNING *`,
      [
        route_id,
        route_name,
        route_short_name,
        agency_id,
        JSON.stringify(polyline),
        route_color,
        route_type,
      ]
    );

    return result.rows[0];
  } catch (err) {
    logger.error('route.model.insert error', { message: err.message });
    throw err;
  }
}

module.exports = { findAll, findById, getStopsForRoute, insert };
