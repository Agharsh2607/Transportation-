const { query } = require('../config/db.config');
const logger = require('../utils/logger');

/**
 * Fetch all stops.
 */
async function findAll() {
  try {
    const result = await query(`SELECT * FROM stops ORDER BY name`, []);
    return result.rows;
  } catch (err) {
    logger.error('stop.model.findAll error', { message: err.message });
    throw err;
  }
}

/**
 * Find a single stop by ID.
 * @param {string} id
 */
async function findById(id) {
  try {
    const result = await query(`SELECT * FROM stops WHERE id = $1`, [id]);
    return result.rows[0] || null;
  } catch (err) {
    logger.error('stop.model.findById error', { id, message: err.message });
    throw err;
  }
}

/**
 * Find stops within a given radius using a bounding-box pre-filter
 * followed by a Haversine approximation in SQL.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 */
async function findNearby(lat, lng, radiusKm) {
  try {
    // Approximate degree offsets for bounding box pre-filter
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    const result = await query(
      `SELECT * FROM (
         SELECT *,
           (6371 * acos(
             LEAST(1.0, cos(radians($1)) * cos(radians(lat)) *
             cos(radians(lng) - radians($2)) +
             sin(radians($1)) * sin(radians(lat)))
           )) AS distance_km
         FROM stops
         WHERE lat BETWEEN $3 AND $4
           AND lng BETWEEN $5 AND $6
       ) sub
       WHERE distance_km <= $7
       ORDER BY distance_km ASC`,
      [lat, lng, lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta, radiusKm]
    );
    return result.rows;
  } catch (err) {
    logger.error('stop.model.findNearby error', { lat, lng, radiusKm, message: err.message });
    throw err;
  }
}

module.exports = { findAll, findById, findNearby };
