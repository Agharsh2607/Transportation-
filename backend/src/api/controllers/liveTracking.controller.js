const vehicleStatusModel = require('../../models/vehicleStatus.model');
const logger = require('../../utils/logger');

class LiveTrackingController {
  /**
   * Start tracking - receive GPS position and store in vehicle_status
   */
  async startTracking(req, res) {
    try {
      const {
        vehicle_id,
        bus_number,
        lat,
        lng,
        speed,
        heading,
        route_id,
        driver_name,
        accuracy
      } = req.body;

      // Validate required fields
      if (!vehicle_id || !bus_number || lat === undefined || lng === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: vehicle_id, bus_number, lat, lng'
        });
      }

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          error: 'Invalid coordinates'
        });
      }

      // Upsert vehicle position
      const vehicle = await vehicleStatusModel.upsertVehicle({
        vehicle_id,
        bus_number,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: parseFloat(speed) || 0,
        heading: parseFloat(heading) || 0,
        status: 'live',
        route_id,
        driver_name,
        accuracy: parseFloat(accuracy) || null
      });

      // Broadcast update via WebSocket
      this.broadcastVehicleUpdate(vehicle);

      logger.info('Vehicle position updated', {
        vehicle_id,
        bus_number,
        lat,
        lng,
        speed
      });

      res.json({
        success: true,
        message: 'Position updated',
        vehicle: {
          vehicle_id: vehicle.vehicle_id,
          bus_number: vehicle.bus_number,
          lat: vehicle.lat,
          lng: vehicle.lng,
          status: vehicle.status,
          last_updated: vehicle.last_updated
        }
      });
    } catch (error) {
      logger.error('Error starting tracking', { error: error.message });
      res.status(500).json({
        error: 'Failed to update position',
        message: error.message
      });
    }
  }

  /**
   * Get all active vehicles
   */
  async getActiveVehicles(req, res) {
    try {
      const vehicles = await vehicleStatusModel.getAllActiveVehicles();

      res.json({
        success: true,
        vehicles,
        count: vehicles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting active vehicles', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicles',
        message: error.message
      });
    }
  }

  /**
   * Get specific vehicle
   */
  async getVehicle(req, res) {
    try {
      const { vehicleId } = req.params;

      if (!vehicleId) {
        return res.status(400).json({
          error: 'Vehicle ID is required'
        });
      }

      const vehicle = await vehicleStatusModel.getVehicle(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          error: 'Vehicle not found'
        });
      }

      res.json({
        success: true,
        vehicle
      });
    } catch (error) {
      logger.error('Error getting vehicle', { error: error.message });
      res.status(500).json({
        error: 'Failed to get vehicle',
        message: error.message
      });
    }
  }

  /**
   * Stop tracking - mark vehicle as offline
   */
  async stopTracking(req, res) {
    try {
      const { vehicle_id } = req.body;

      if (!vehicle_id) {
        return res.status(400).json({
          error: 'Vehicle ID is required'
        });
      }

      // Update vehicle status to offline
      const vehicle = await vehicleStatusModel.upsertVehicle({
        vehicle_id,
        bus_number: 'Unknown', // Will be updated from existing data
        lat: 0,
        lng: 0,
        status: 'offline'
      });

      // Broadcast update
      this.broadcastVehicleUpdate(vehicle);

      res.json({
        success: true,
        message: 'Tracking stopped',
        vehicle_id
      });
    } catch (error) {
      logger.error('Error stopping tracking', { error: error.message });
      res.status(500).json({
        error: 'Failed to stop tracking',
        message: error.message
      });
    }
  }

  /**
   * Broadcast vehicle update via WebSocket
   */
  broadcastVehicleUpdate(vehicle) {
    try {
      // Get WebSocket broadcaster
      const { broadcast } = require('../../websocket/ws.broadcaster');
      
      // Broadcast to all clients
      broadcast('live_vehicles', {
        type: 'vehicle_update',
        vehicle: {
          vehicle_id: vehicle.vehicle_id,
          bus_number: vehicle.bus_number,
          lat: parseFloat(vehicle.lat),
          lng: parseFloat(vehicle.lng),
          speed: parseFloat(vehicle.speed) || 0,
          heading: parseFloat(vehicle.heading) || 0,
          status: vehicle.status,
          last_updated: vehicle.last_updated,
          route_id: vehicle.route_id,
          driver_name: vehicle.driver_name,
          accuracy: vehicle.accuracy
        },
        timestamp: Date.now()
      });

      logger.debug('Vehicle update broadcasted', { vehicle_id: vehicle.vehicle_id });
    } catch (error) {
      logger.warn('Failed to broadcast vehicle update', { error: error.message });
    }
  }
}

module.exports = new LiveTrackingController();