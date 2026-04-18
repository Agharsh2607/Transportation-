const stopModel = require('../../models/stop.model');
const logger = require('../../utils/logger');

/**
 * GET /api/stops
 */
async function getAll(req, res, next) {
  try {
    const stops = await stopModel.findAll();
    res.json({ data: stops, count: stops.length });
  } catch (err) {
    logger.error('stop.controller.getAll error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/stops/:id
 */
async function getById(req, res, next) {
  try {
    const stop = await stopModel.findById(req.params.id);
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found', code: 404 });
    }
    res.json({ data: stop });
  } catch (err) {
    logger.error('stop.controller.getById error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/stops/nearby?lat=&lng=&radius=
 */
async function getNearby(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 1.0;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters are required', code: 400 });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'lat/lng out of valid range', code: 400 });
    }

    const stops = await stopModel.findNearby(lat, lng, radius);
    res.json({ data: stops, count: stops.length });
  } catch (err) {
    logger.error('stop.controller.getNearby error', { message: err.message });
    next(err);
  }
}

module.exports = { getAll, getById, getNearby };
