const fs = require('fs');
const csv = require('csv-parser');
const logger = require('../utils/logger');

class GTFSParser {
  /**
   * Parse GTFS routes.txt
   */
  async parseRoutes(filePath) {
    return new Promise((resolve, reject) => {
      const routes = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          routes.push({
            route_id: row.route_id,
            agency_id: row.agency_id || 'DTC',
            route_short_name: row.route_short_name,
            route_long_name: row.route_long_name,
            route_desc: row.route_desc,
            route_type: row.route_type,
            route_url: row.route_url,
            route_color: row.route_color || '667eea',
            route_text_color: row.route_text_color || 'ffffff',
          });
        })
        .on('end', () => resolve(routes))
        .on('error', reject);
    });
  }

  /**
   * Parse GTFS stops.txt
   */
  async parseStops(filePath) {
    return new Promise((resolve, reject) => {
      const stops = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          stops.push({
            stop_id: row.stop_id,
            stop_code: row.stop_code,
            stop_name: row.stop_name,
            stop_desc: row.stop_desc,
            stop_lat: parseFloat(row.stop_lat),
            stop_lon: parseFloat(row.stop_lon),
            zone_id: row.zone_id,
            stop_url: row.stop_url,
            location_type: row.location_type || 0,
            parent_station: row.parent_station,
            stop_timezone: row.stop_timezone,
            wheelchair_boarding: row.wheelchair_boarding,
          });
        })
        .on('end', () => resolve(stops))
        .on('error', reject);
    });
  }

  /**
   * Parse GTFS stop_times.txt
   */
  async parseStopTimes(filePath) {
    return new Promise((resolve, reject) => {
      const stopTimes = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          stopTimes.push({
            trip_id: row.trip_id,
            arrival_time: row.arrival_time,
            departure_time: row.departure_time,
            stop_id: row.stop_id,
            stop_sequence: parseInt(row.stop_sequence),
            stop_headsign: row.stop_headsign,
            pickup_type: row.pickup_type || 0,
            drop_off_type: row.drop_off_type || 0,
          });
        })
        .on('end', () => resolve(stopTimes))
        .on('error', reject);
    });
  }

  /**
   * Parse GTFS trips.txt
   */
  async parseTrips(filePath) {
    return new Promise((resolve, reject) => {
      const trips = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          trips.push({
            route_id: row.route_id,
            service_id: row.service_id,
            trip_id: row.trip_id,
            trip_headsign: row.trip_headsign,
            trip_short_name: row.trip_short_name,
            direction_id: row.direction_id,
            block_id: row.block_id,
            shape_id: row.shape_id,
            wheelchair_accessible: row.wheelchair_accessible || 0,
            bikes_allowed: row.bikes_allowed || 0,
          });
        })
        .on('end', () => resolve(trips))
        .on('error', reject);
    });
  }

  /**
   * Build route polylines from stops
   */
  buildPolylines(routes, stops, trips, stopTimes) {
    const polylines = {};

    routes.forEach(route => {
      // Get all trips for this route
      const routeTrips = trips.filter(t => t.route_id === route.route_id);
      
      if (routeTrips.length === 0) return;

      // Get first trip's stops
      const firstTrip = routeTrips[0];
      const tripStops = stopTimes
        .filter(st => st.trip_id === firstTrip.trip_id)
        .sort((a, b) => a.stop_sequence - b.stop_sequence);

      // Build polyline
      const polyline = tripStops.map(st => {
        const stop = stops.find(s => s.stop_id === st.stop_id);
        if (!stop) return null;
        return [stop.stop_lon, stop.stop_lat];
      }).filter(p => p !== null);

      polylines[route.route_id] = polyline;
    });

    return polylines;
  }
}

module.exports = new GTFSParser();
