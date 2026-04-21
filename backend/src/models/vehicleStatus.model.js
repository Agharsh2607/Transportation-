const { query } = require('../config/db.config');
const logger = require('../utils/logger');

// In-memory fallback storage
let inMemoryVehicles = new Map();
let useInMemory = false;

// Status thresholds (seconds since last update)
const STATUS_THRESHOLDS = {
  LIVE_MAX: 10,
  DELAYED_MAX: 30,
};

/**
 * Compute vehicle status from seconds since last update.
 * @param {number} secondsSinceUpdate
 * @returns {'live'|'delayed'|'offline'}
 */
function computeStatus(secondsSinceUpdate) {
  if (secondsSinceUpdate <= STATUS_THRESHOLDS.LIVE_MAX) return 'live';
  if (secondsSinceUpdate <= STATUS_THRESHOLDS.DELAYED_MAX) return 'delayed';
  return 'offline';
}

/**
 * Vehicle Status Model - Single source of truth for live vehicle tracking
 */
class VehicleStatusModel {
  /**
   * Initialize and check database availability
   */
  async initialize() {
    try {
      await query('SELECT 1', []);
      logger.info('PostgreSQL available, using database storage');
      
      // Try to create table if it doesn't exist
      await this.createTableIfNotExists();
    } catch (error) {
      logger.warn('PostgreSQL not available, using in-memory storage', { error: error.message });
      useInMemory = true;
    }
  }

  /**
   * Create vehicle_status table if it doesn't exist.
   * Includes route_index and next_stop_id columns for route matching.
   */
  async createTableIfNotExists() {
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS vehicle_status (
          vehicle_id VARCHAR(50) PRIMARY KEY,
          bus_number VARCHAR(20) NOT NULL,
          lat DECIMAL(10, 8) NOT NULL,
          lng DECIMAL(11, 8) NOT NULL,
          speed DECIMAL(5, 2) DEFAULT 0,
          heading DECIMAL(5, 2) DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'live',
          route_id VARCHAR(50),
          route_index INTEGER DEFAULT -1,
          next_stop_id VARCHAR(50),
          driver_name VARCHAR(100),
          accuracy DECIMAL(6, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_vehicle_status_last_updated ON vehicle_status(last_updated);
        CREATE INDEX IF NOT EXISTS idx_vehicle_status_status ON vehicle_status(status);
        CREATE INDEX IF NOT EXISTS idx_vehicle_status_route ON vehicle_status(route_id);
        CREATE INDEX IF NOT EXISTS idx_vehicle_status_bbox ON vehicle_status(lat, lng);
      `;
      
      await query(sql, []);
      
      // Add new columns if they don't exist (migration-safe)
      try {
        await query(`ALTER TABLE vehicle_status ADD COLUMN IF NOT EXISTS route_index INTEGER DEFAULT -1`, []);
        await query(`ALTER TABLE vehicle_status ADD COLUMN IF NOT EXISTS next_stop_id VARCHAR(50)`, []);
      } catch {
        // Columns may already exist, that's fine
      }
      
      logger.info('Vehicle status table created/verified');
    } catch (error) {
      logger.error('Failed to create vehicle_status table', { error: error.message });
      throw error;
    }
  }

  /**
   * Upsert vehicle position
   */
  async upsertVehicle(vehicleData) {
    try {
      const {
        vehicle_id,
        bus_number,
        lat,
        lng,
        speed = 0,
        heading = 0,
        status = 'live',
        route_id,
        driver_name,
        accuracy
      } = vehicleData;

      if (useInMemory) {
        const existing = inMemoryVehicles.get(vehicle_id);
        const vehicle = {
          vehicle_id,
          bus_number,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          speed: parseFloat(speed),
          heading: parseFloat(heading),
          status,
          route_id,
          driver_name,
          accuracy: parseFloat(accuracy) || null,
          last_updated: new Date().toISOString(),
          created_at: existing ? existing.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        inMemoryVehicles.set(vehicle_id, vehicle);
        return vehicle;
      }

      const result = await query(
        `INSERT INTO vehicle_status 
         (vehicle_id, bus_number, lat, lng, speed, heading, status, route_id, driver_name, accuracy, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (vehicle_id) 
         DO UPDATE SET
           bus_number = $2,
           lat = $3,
           lng = $4,
           speed = $5,
           heading = $6,
           status = $7,
           route_id = $8,
           driver_name = $9,
           accuracy = $10,
           last_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        [vehicle_id, bus_number, lat, lng, speed, heading, status, route_id, driver_name, accuracy]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error upserting vehicle', { error: error.message, vehicleData });
      throw error;
    }
  }

  /**
   * Get all active vehicles (updated in last 10 minutes).
   * Status is computed from last_updated, not stored value.
   */
  async getAllActiveVehicles() {
    try {
      if (useInMemory) {
        const now = new Date();
        const vehicles = Array.from(inMemoryVehicles.values()).map(vehicle => {
          const lastUpdate = new Date(vehicle.last_updated);
          const secondsSinceUpdate = Math.floor((now - lastUpdate) / 1000);

          return {
            ...vehicle,
            status: computeStatus(secondsSinceUpdate),
            seconds_since_update: secondsSinceUpdate
          };
        });

        // Filter out vehicles older than 10 minutes
        return vehicles.filter(v => v.seconds_since_update < 600);
      }

      const result = await query(
        `SELECT 
           vehicle_id, bus_number, lat, lng, speed, heading,
           last_updated, status, route_id, route_index, next_stop_id,
           driver_name, accuracy,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
         FROM vehicle_status 
         WHERE last_updated > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
         ORDER BY last_updated DESC`,
        []
      );

      // Compute status from last_updated time
      return result.rows.map(vehicle => ({
        ...vehicle,
        status: computeStatus(vehicle.seconds_since_update),
        seconds_since_update: Math.floor(vehicle.seconds_since_update)
      }));
    } catch (error) {
      logger.error('Error getting active vehicles', { error: error.message });
      throw error;
    }
  }

  /**
   * Get vehicles within a bounding box (viewport API).
   * @param {number} minLat
   * @param {number} minLng
   * @param {number} maxLat
   * @param {number} maxLng
   * @returns {Promise<Array>}
   */
  async getVehiclesInBBox(minLat, minLng, maxLat, maxLng) {
    try {
      if (useInMemory) {
        const now = new Date();
        return Array.from(inMemoryVehicles.values())
          .filter(v => {
            const lat = parseFloat(v.lat);
            const lng = parseFloat(v.lng);
            const lastUpdate = new Date(v.last_updated);
            const secSince = Math.floor((now - lastUpdate) / 1000);
            return (
              lat >= minLat && lat <= maxLat &&
              lng >= minLng && lng <= maxLng &&
              secSince < 600
            );
          })
          .map(v => {
            const secSince = Math.floor((new Date() - new Date(v.last_updated)) / 1000);
            return { ...v, status: computeStatus(secSince), seconds_since_update: secSince };
          });
      }

      const result = await query(
        `SELECT 
           vehicle_id, bus_number, lat, lng, speed, heading,
           last_updated, status, route_id, route_index, next_stop_id,
           driver_name, accuracy,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
         FROM vehicle_status 
         WHERE lat >= $1 AND lat <= $3
           AND lng >= $2 AND lng <= $4
           AND last_updated > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
         ORDER BY last_updated DESC`,
        [minLat, minLng, maxLat, maxLng]
      );

      return result.rows.map(vehicle => ({
        ...vehicle,
        status: computeStatus(vehicle.seconds_since_update),
        seconds_since_update: Math.floor(vehicle.seconds_since_update)
      }));
    } catch (error) {
      logger.error('Error getting vehicles in bbox', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all vehicles assigned to a specific route.
   * @param {string} routeId
   * @returns {Promise<Array>}
   */
  async getVehiclesByRoute(routeId) {
    try {
      if (useInMemory) {
        const now = new Date();
        return Array.from(inMemoryVehicles.values())
          .filter(v => v.route_id === routeId)
          .map(v => {
            const secSince = Math.floor((now - new Date(v.last_updated)) / 1000);
            return { ...v, status: computeStatus(secSince), seconds_since_update: secSince };
          });
      }

      const result = await query(
        `SELECT 
           vehicle_id, bus_number, lat, lng, speed, heading,
           last_updated, status, route_id, route_index, next_stop_id,
           driver_name, accuracy,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
         FROM vehicle_status 
         WHERE route_id = $1
           AND last_updated > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
         ORDER BY last_updated DESC`,
        [routeId]
      );

      return result.rows.map(vehicle => ({
        ...vehicle,
        status: computeStatus(vehicle.seconds_since_update),
        seconds_since_update: Math.floor(vehicle.seconds_since_update)
      }));
    } catch (error) {
      logger.error('Error getting vehicles by route', { error: error.message, routeId });
      throw error;
    }
  }

  /**
   * Get specific vehicle
   */
  async getVehicle(vehicleId) {
    try {
      if (useInMemory) {
        const vehicle = inMemoryVehicles.get(vehicleId);
        if (!vehicle) return null;

        const now = new Date();
        const lastUpdate = new Date(vehicle.last_updated);
        const secondsSinceUpdate = Math.floor((now - lastUpdate) / 1000);

        return {
          ...vehicle,
          status: computeStatus(secondsSinceUpdate),
          seconds_since_update: secondsSinceUpdate
        };
      }

      const result = await query(
        `SELECT 
           vehicle_id, bus_number, lat, lng, speed, heading,
           last_updated, status, route_id, route_index, next_stop_id,
           driver_name, accuracy,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
         FROM vehicle_status 
         WHERE vehicle_id = $1`,
        [vehicleId]
      );

      if (result.rows.length === 0) return null;

      const vehicle = result.rows[0];
      return {
        ...vehicle,
        status: computeStatus(vehicle.seconds_since_update),
        seconds_since_update: Math.floor(vehicle.seconds_since_update)
      };
    } catch (error) {
      logger.error('Error getting vehicle', { error: error.message, vehicleId });
      throw error;
    }
  }

  /**
   * Delete old vehicles (cleanup)
   */
  async cleanupOldVehicles() {
    try {
      if (useInMemory) {
        const now = new Date();
        let cleanedCount = 0;
        
        for (const [vehicleId, vehicle] of inMemoryVehicles.entries()) {
          const lastUpdate = new Date(vehicle.last_updated);
          const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
          
          if (hoursSinceUpdate > 1) {
            inMemoryVehicles.delete(vehicleId);
            cleanedCount++;
          }
        }

        if (cleanedCount > 0) {
          logger.info('Cleaned up old vehicles from memory', { count: cleanedCount });
        }

        return cleanedCount;
      }

      const result = await query(
        `DELETE FROM vehicle_status 
         WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '1 hour'
         RETURNING vehicle_id`,
        []
      );

      if (result.rows.length > 0) {
        logger.info('Cleaned up old vehicles', { 
          count: result.rows.length,
          vehicles: result.rows.map(r => r.vehicle_id)
        });
      }

      return result.rows.length;
    } catch (error) {
      logger.error('Error cleaning up old vehicles', { error: error.message });
      throw error;
    }
  }
}

const vehicleStatusModel = new VehicleStatusModel();

// Initialize on module load
vehicleStatusModel.initialize().catch(err => {
  logger.error('Failed to initialize vehicle status model', { error: err.message });
});

// Export both the model and the computeStatus helper
module.exports = vehicleStatusModel;
module.exports.computeStatus = computeStatus;