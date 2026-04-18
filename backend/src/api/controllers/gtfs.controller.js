const gtfsLoader = require('../../services/gtfs.loader');
const routeModel = require('../../models/route.model');
const stopModel = require('../../models/stop.model');
const logger = require('../../utils/logger');

class GTFSController {
  async loadGTFS(req, res) {
    try {
      const { gtfsPath } = req.body;

      if (!gtfsPath) {
        return res.status(400).json({ error: 'gtfsPath is required' });
      }

      const result = await gtfsLoader.loadGTFS(gtfsPath);

      res.json({
        success: true,
        message: 'GTFS data loaded successfully',
        ...result,
      });
    } catch (err) {
      logger.error('Error loading GTFS', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  async getRoutes(req, res) {
    try {
      const routes = await routeModel.findAll();
      res.json(routes);
    } catch (err) {
      logger.error('Error getting routes', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  async getStops(req, res) {
    try {
      const stops = await stopModel.findAll();
      res.json(stops);
    } catch (err) {
      logger.error('Error getting stops', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  async getRouteStops(req, res) {
    try {
      const { routeId } = req.params;
      
      if (!routeId) {
        return res.status(400).json({ error: 'routeId is required' });
      }

      const route = await routeModel.findById(routeId);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      res.json(route);
    } catch (err) {
      logger.error('Error getting route stops', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new GTFSController();
