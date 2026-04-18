require('dotenv').config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// PostgreSQL
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'transit_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX || '10', 10);

// Redis
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Auth
const VEHICLE_SECRET = process.env.VEHICLE_SECRET || 'vehicle_secret_key_change_in_prod';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret_change_in_prod';

// ETA
const ETA_UPDATE_INTERVAL_MS = parseInt(process.env.ETA_UPDATE_INTERVAL_MS || '800', 10);
const ETA_DEGRADED_INTERVAL_MS = parseInt(process.env.ETA_DEGRADED_INTERVAL_MS || '5000', 10);
const OFFLINE_BUFFER_WINDOW_MIN = parseInt(process.env.OFFLINE_BUFFER_WINDOW_MIN || '5', 10);

module.exports = {
  PORT,
  NODE_ENV,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_POOL_MAX,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  VEHICLE_SECRET,
  ADMIN_JWT_SECRET,
  ETA_UPDATE_INTERVAL_MS,
  ETA_DEGRADED_INTERVAL_MS,
  OFFLINE_BUFFER_WINDOW_MIN,
};
