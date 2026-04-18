const gpsService = require('../../services/gps.service');
const logger = require('../../utils/logger');

class GPSController {
  /**
   * Receive GPS update from driver app
   */
  async receiveGPSUpdate(req, res) {
    try {
      const {
        vehicle_id,
        route_id,
        driver_name,
        latitude,
        longitude,
        speed,
        accuracy,
        timestamp,
      } = req.body;

      // Validate required fields
      if (!vehicle_id || !route_id || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: vehicle_id, route_id, latitude, longitude',
        });
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          error: 'Invalid coordinates',
        });
      }

      // Process GPS update
      const result = await gpsService.processGPSUpdate({
        vehicle_id,
        route_id,
        driver_name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: parseFloat(speed) || 0,
        accuracy: parseFloat(accuracy) || 0,
        timestamp: timestamp || Date.now(),
      });

      res.json({
        success: true,
        message: 'GPS update processed',
        vehicle_id,
        timestamp: result.timestamp,
      });
    } catch (error) {
      logger.error('GPS update error', { error: error.message });
      res.status(500).json({
        error: 'Failed to process GPS update',
        message: error.message,
      });
    }
  }

  /**
   * Get latest position for a vehicle
   */
  async getVehiclePosition(req, res) {
    try {
      const { vehicleId } = req.params;

      if (!vehicleId) {
        return res.status(400).json({
          error: 'Vehicle ID is required',
        });
      }

      const position = await gpsService.getVehiclePosition(vehicleId);

      if (!position) {
        return res.status(404).json({
          error: 'Vehicle not found or no recent position data',
        });
      }

      res.json(position);
    } catch (error) {
      logger.error('Get vehicle position error', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicle position',
        message: error.message,
      });
    }
  }

  /**
   * Get all active vehicles
   */
  async getAllVehicles(req, res) {
    try {
      const vehicles = await gpsService.getAllActiveVehicles();

      res.json({
        vehicles,
        count: vehicles.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Get all vehicles error', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicles',
        message: error.message,
      });
    }
  }
}

module.exports = new GPSController();