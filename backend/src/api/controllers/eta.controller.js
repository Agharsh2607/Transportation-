const cacheService = require('../../services/cache.service');
const routeService = require('../../services/route.service');
const etaEngine = require('../../eta/eta.engine');
const logger = require('../../utils/logger');

/**
 * GET /api/eta/:vehicleId
 * Returns ETA predictions for all upcoming stops on the vehicle's route.
 */
async function getETA(req, res, next) {
  try {
    const { vehicleId } = req.params;

    // Get live vehicle state from Redis cache
    const vehicleState = await cacheService.getVehicleState(vehicleId);
    if (!vehicleState) {
      return res.status(404).json({
        error: 'No live state found for vehicle. Vehicle may be offline.',
        code: 404,
      });
    }

    const lat = parseFloat(vehicleState.lat);
    const lng = parseFloat(vehicleState.lng);
    const routeId = vehicleState.route_id;

    if (!routeId) {
      return res.status(400).json({ error: 'Vehicle has no assigned route', code: 400 });
    }

    // Get stops for the vehicle's route
    const stops = await routeService.getStopsForRoute(routeId);
    if (!stops || stops.length === 0) {
      return res.json({ data: [], message: 'No stops found for route' });
    }

    const vehicle = { id: vehicleId, lat, lng, route_id: routeId };
    const predictions = await etaEngine.predictAllStops(vehicle, stops);

    res.json({
      data: predictions,
      vehicle_id: vehicleId,
      route_id: routeId,
      count: predictions.length,
    });
  } catch (err) {
    logger.error('eta.controller.getETA error', { message: err.message });
    next(err);
  }
}

module.exports = { getETA };
