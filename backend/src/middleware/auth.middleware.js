const { VEHICLE_SECRET } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate vehicle GPS ingest requests.
 * Expects: Authorization: Bearer <VEHICLE_SECRET>
 */
function vehicleAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header', code: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (token !== VEHICLE_SECRET) {
    logger.warn('vehicleAuth: invalid token attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid vehicle secret', code: 401 });
  }

  next();
}

/**
 * Middleware to authenticate admin API requests.
 *
 * HACKATHON STUB: calls next() unconditionally.
 * PRODUCTION: Replace with JWT verification:
 *   const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
 *   req.admin = decoded;
 */
function adminAuth(req, res, next) {
  // TODO (production): verify JWT from Authorization header using ADMIN_JWT_SECRET
  next();
}

module.exports = { vehicleAuth, adminAuth };
