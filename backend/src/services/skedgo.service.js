/**
 * SkedGo TripGo API Integration
 * Fetches real transit routes and location data
 */

const logger = require('../utils/logger');

const SKEDGO_BASE_URL = 'https://skedgo-tripgo-v1.p.rapidapi.com';
const RAPIDAPI_HOST = 'skedgo-tripgo-v1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '172ce50614msh088b79d4adb32d2p12b5b1jsn21a9c7806f2f';

class SkedGoService {
  /**
   * Geocode a location to get coordinates
   * @param {string} query - Location query (e.g., "Times Square, NYC")
   * @returns {Promise<Array>} Array of location results
   */
  async geocodeLocation(query) {
    try {
      const url = new URL(`${SKEDGO_BASE_URL}/geocode.json`);
      url.searchParams.append('q', query);
      url.searchParams.append('allowFoursquare', 'false');
      url.searchParams.append('allowGoogle', 'false');
      url.searchParams.append('allowYelp', 'false');
      url.searchParams.append('allowW3W', 'false');
      url.searchParams.append('limit', '25');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`SkedGo API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Geocoded location', { query, results: data.locations?.length || 0 });
      return data.locations || [];
    } catch (err) {
      logger.error('skedgo.service.geocodeLocation error', { query, message: err.message });
      throw err;
    }
  }

  /**
   * Get transit routes between two locations
   * @param {number} fromLat - Starting latitude
   * @param {number} fromLng - Starting longitude
   * @param {number} toLat - Destination latitude
   * @param {number} toLng - Destination longitude
   * @returns {Promise<Array>} Array of route options
   */
  async getRoutes(fromLat, fromLng, toLat, toLng) {
    try {
      const url = new URL(`${SKEDGO_BASE_URL}/routing.json`);
      url.searchParams.append('fromLat', fromLat);
      url.searchParams.append('fromLng', fromLng);
      url.searchParams.append('toLat', toLat);
      url.searchParams.append('toLng', toLng);
      url.searchParams.append('modes', 'pt_pub'); // Public transport only

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`SkedGo API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Retrieved routes', { from: `${fromLat},${fromLng}`, to: `${toLat},${toLng}` });
      return data.routes || [];
    } catch (err) {
      logger.error('skedgo.service.getRoutes error', { message: err.message });
      throw err;
    }
  }

  /**
   * Get real-time vehicle positions for a route
   * @param {string} routeId - Route identifier
   * @returns {Promise<Array>} Array of vehicle positions
   */
  async getVehiclePositions(routeId) {
    try {
      const url = new URL(`${SKEDGO_BASE_URL}/realtime.json`);
      url.searchParams.append('routeId', routeId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`SkedGo API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Retrieved vehicle positions', { routeId, vehicles: data.vehicles?.length || 0 });
      return data.vehicles || [];
    } catch (err) {
      logger.error('skedgo.service.getVehiclePositions error', { routeId, message: err.message });
      throw err;
    }
  }

  /**
   * Search for transit agencies
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Array>} Array of transit agencies
   */
  async getTransitAgencies(lat, lng) {
    try {
      const url = new URL(`${SKEDGO_BASE_URL}/agencies.json`);
      url.searchParams.append('lat', lat);
      url.searchParams.append('lng', lng);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`SkedGo API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Retrieved transit agencies', { lat, lng, agencies: data.agencies?.length || 0 });
      return data.agencies || [];
    } catch (err) {
      logger.error('skedgo.service.getTransitAgencies error', { message: err.message });
      throw err;
    }
  }

  /**
   * Get stops for a route
   * @param {string} routeId - Route identifier
   * @returns {Promise<Array>} Array of stops
   */
  async getRouteStops(routeId) {
    try {
      const url = new URL(`${SKEDGO_BASE_URL}/stops.json`);
      url.searchParams.append('routeId', routeId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`SkedGo API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Retrieved route stops', { routeId, stops: data.stops?.length || 0 });
      return data.stops || [];
    } catch (err) {
      logger.error('skedgo.service.getRouteStops error', { routeId, message: err.message });
      throw err;
    }
  }
}

module.exports = new SkedGoService();
