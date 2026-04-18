/**
 * Transit Controller - Real transit data from SkedGo API
 */

const logger = require('../../utils/logger');
const skedGoService = require('../../services/skedgo.service');

class TransitController {
  /**
   * Search for locations
   * GET /api/transit/search?q=Times Square
   */
  async searchLocations(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      const locations = await skedGoService.geocodeLocation(q);

      res.json({
        success: true,
        query: q,
        locations: locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          latitude: loc.lat,
          longitude: loc.lng,
          type: loc.type,
        })),
      });
    } catch (err) {
      logger.error('Error searching locations', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get transit routes between two locations
   * GET /api/transit/routes?fromLat=40.7484&fromLng=-73.9857&toLat=40.7128&toLng=-74.0060
   */
  async getRoutes(req, res) {
    try {
      const { fromLat, fromLng, toLat, toLng } = req.query;

      if (!fromLat || !fromLng || !toLat || !toLng) {
        return res.status(400).json({
          error: 'fromLat, fromLng, toLat, toLng are required',
        });
      }

      const routes = await skedGoService.getRoutes(
        parseFloat(fromLat),
        parseFloat(fromLng),
        parseFloat(toLat),
        parseFloat(toLng)
      );

      res.json({
        success: true,
        from: { lat: fromLat, lng: fromLng },
        to: { lat: toLat, lng: toLng },
        routes: routes.map((route) => ({
          id: route.id,
          name: route.name,
          duration: route.duration,
          distance: route.distance,
          stops: route.stops?.length || 0,
          polyline: route.polyline,
          segments: route.segments,
        })),
      });
    } catch (err) {
      logger.error('Error getting routes', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get vehicle positions for a route
   * GET /api/transit/vehicles?routeId=route_001
   */
  async getVehiclePositions(req, res) {
    try {
      const { routeId } = req.query;

      if (!routeId) {
        return res.status(400).json({ error: 'routeId is required' });
      }

      const vehicles = await skedGoService.getVehiclePositions(routeId);

      res.json({
        success: true,
        routeId,
        vehicles: vehicles.map((vehicle) => ({
          id: vehicle.id,
          latitude: vehicle.lat,
          longitude: vehicle.lng,
          heading: vehicle.heading,
          speed: vehicle.speed,
          timestamp: vehicle.timestamp,
        })),
      });
    } catch (err) {
      logger.error('Error getting vehicle positions', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get transit agencies in an area
   * GET /api/transit/agencies?lat=40.7484&lng=-73.9857
   */
  async getAgencies(req, res) {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
      }

      const agencies = await skedGoService.getTransitAgencies(parseFloat(lat), parseFloat(lng));

      res.json({
        success: true,
        location: { lat, lng },
        agencies: agencies.map((agency) => ({
          id: agency.id,
          name: agency.name,
          region: agency.region,
          timezone: agency.timezone,
          website: agency.website,
        })),
      });
    } catch (err) {
      logger.error('Error getting agencies', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get stops for a route
   * GET /api/transit/stops?routeId=route_001
   */
  async getStops(req, res) {
    try {
      const { routeId } = req.query;

      if (!routeId) {
        return res.status(400).json({ error: 'routeId is required' });
      }

      const stops = await skedGoService.getRouteStops(routeId);

      res.json({
        success: true,
        routeId,
        stops: stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequence: stop.sequence,
          arrivalTime: stop.arrivalTime,
          departureTime: stop.departureTime,
        })),
      });
    } catch (err) {
      logger.error('Error getting stops', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = TransitController;
