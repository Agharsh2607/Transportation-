const { query, getClient } = require('../config/db.config');
const logger = require('../utils/logger');

/**
 * Insert a single location ping.
 * @param {object} packet
 */
async function insert(packet) {
  const {
    vehicle_id, lat, lng, speed_kmh, heading,
    seq, replayed, signal_strength, timestamp,
  } = packet;
  try {
    const result = await query(
      `INSERT INTO location_pings
         (vehicle_id, lat, lng, speed_kmh, heading, seq, replayed, signal_strength, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [vehicle_id, lat, lng, speed_kmh, heading, seq, replayed, signal_strength, timestamp || new Date().toISOString()]
    );
    return result.rows[0];
  } catch (err) {
    logger.error('locationPing.model.insert error', { vehicle_id, message: err.message });
    throw err;
  }
}

/**
 * Batch insert multiple location pings in a single transaction.
 * @param {Array<object>} packets
 */
async function insertBatch(packets) {
  if (!packets || packets.length === 0) return [];
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const packet of packets) {
      const { vehicle_id, lat, lng, speed_kmh, heading, seq, replayed, signal_strength, timestamp } = packet;
      const result = await client.query(
        `INSERT INTO location_pings
           (vehicle_id, lat, lng, speed_kmh, heading, seq, replayed, signal_strength, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [vehicle_id, lat, lng, speed_kmh, heading, seq, replayed, signal_strength, timestamp || new Date().toISOString()]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('locationPing.model.insertBatch error', { message: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get the most recent ping for a vehicle.
 * @param {string} vehicleId
 */
async function getLatest(vehicleId) {
  try {
    const result = await query(
      `SELECT * FROM location_pings
       WHERE vehicle_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [vehicleId]
    );
    return result.rows[0] || null;
  } catch (err) {
    logger.error('locationPing.model.getLatest error', { vehicleId, message: err.message });
    throw err;
  }
}

/**
 * Get location history for a vehicle within a time range.
 * @param {string} vehicleId
 * @param {string} from - ISO timestamp
 * @param {string} to - ISO timestamp
 */
async function getHistory(vehicleId, from, to) {
  try {
    const result = await query(
      `SELECT * FROM location_pings
       WHERE vehicle_id = $1
         AND recorded_at >= $2
         AND recorded_at <= $3
       ORDER BY recorded_at ASC`,
      [vehicleId, from, to]
    );
    return result.rows;
  } catch (err) {
    logger.error('locationPing.model.getHistory error', { vehicleId, message: err.message });
    throw err;
  }
}

/**
 * Check if a sequence number already exists for a vehicle (duplicate detection).
 * @param {string} vehicleId
 * @param {number} seq
 * @returns {Promise<boolean>}
 */
async function isDuplicate(vehicleId, seq) {
  try {
    const result = await query(
      `SELECT 1 FROM location_pings WHERE vehicle_id = $1 AND seq = $2 LIMIT 1`,
      [vehicleId, seq]
    );
    return result.rowCount > 0;
  } catch (err) {
    logger.error('locationPing.model.isDuplicate error', { vehicleId, seq, message: err.message });
    throw err;
  }
}

module.exports = { insert, insertBatch, getLatest, getHistory, isDuplicate };
