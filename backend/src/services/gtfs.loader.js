const gtfsParser = require('./gtfs.parser');
const routeModel = require('../models/route.model');
const stopModel = require('../models/stop.model');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class GTFSLoader {
  async loadGTFS(gtfsPath) {
    try {
      logger.info('Starting GTFS load', { path: gtfsPath });

      // Check if path exists
      if (!fs.existsSync(gtfsPath)) {
        throw new Error(`GTFS path does not exist: ${gtfsPath}`);
      }

      // Parse all files
      const routesPath = path.join(gtfsPath, 'routes.txt');
      const stopsPath = path.join(gtfsPath, 'stops.txt');
      const stopTimesPath = path.join(gtfsPath, 'stop_times.txt');
      const tripsPath = path.join(gtfsPath, 'trips.txt');

      // Check if files exist
      if (!fs.existsSync(routesPath)) throw new Error(`routes.txt not found at ${routesPath}`);
      if (!fs.existsSync(stopsPath)) throw new Error(`stops.txt not found at ${stopsPath}`);
      if (!fs.existsSync(stopTimesPath)) throw new Error(`stop_times.txt not found at ${stopTimesPath}`);
      if (!fs.existsSync(tripsPath)) throw new Error(`trips.txt not found at ${tripsPath}`);

      const routes = await gtfsParser.parseRoutes(routesPath);
      const stops = await gtfsParser.parseStops(stopsPath);
      const stopTimes = await gtfsParser.parseStopTimes(stopTimesPath);
      const trips = await gtfsParser.parseTrips(tripsPath);

      logger.info('Parsed GTFS files', {
        routes: routes.length,
        stops: stops.length,
        stopTimes: stopTimes.length,
        trips: trips.length,
      });

      // Build polylines
      const polylines = gtfsParser.buildPolylines(routes, stops, trips, stopTimes);

      // Insert routes with polylines
      let routesInserted = 0;
      for (const route of routes) {
        try {
          await routeModel.insert({
            route_id: route.route_id,
            route_name: route.route_long_name || route.route_short_name,
            route_short_name: route.route_short_name,
            agency_id: route.agency_id,
            polyline: polylines[route.route_id] || [],
            route_color: route.route_color,
            route_type: route.route_type,
          });
          routesInserted++;
        } catch (err) {
          logger.warn(`Failed to insert route ${route.route_id}`, { error: err.message });
        }
      }

      logger.info('Inserted routes', { count: routesInserted });

      // Insert stops
      let stopsInserted = 0;
      for (const stop of stops) {
        try {
          await stopModel.insert({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            latitude: stop.stop_lat,
            longitude: stop.stop_lon,
            stop_code: stop.stop_code,
            wheelchair_boarding: stop.wheelchair_boarding,
          });
          stopsInserted++;
        } catch (err) {
          logger.warn(`Failed to insert stop ${stop.stop_id}`, { error: err.message });
        }
      }

      logger.info('Inserted stops', { count: stopsInserted });

      return {
        success: true,
        routes: routesInserted,
        stops: stopsInserted,
        message: `Loaded ${routesInserted} routes and ${stopsInserted} stops`,
      };
    } catch (err) {
      logger.error('GTFS load error', { message: err.message });
      throw err;
    }
  }
}

module.exports = new GTFSLoader();
