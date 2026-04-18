# Real Indian Bus Tracking System - Implementation Guide

## QUICK START: DELHI BUS TRACKING

### Step 1: Download GTFS Data

```bash
# Create data directory
mkdir -p backend/data/gtfs

# Download Delhi GTFS
cd backend/data/gtfs
wget https://data.gov.in/resource/delhi-bus-routes-and-stops
# Or manually download from: https://data.gov.in/resource/delhi-bus-routes-and-stops

# Extract
unzip delhi-gtfs.zip

# You should have:
# - routes.txt
# - stops.txt
# - stop_times.txt
# - trips.txt
# - calendar.txt
```

### Step 2: Create GTFS Parser Service

```javascript
// backend/src/services/gtfs.parser.js

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
  buildPolylines(routes, stops, stopTimes) {
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
        return [stop.stop_lon, stop.stop_lat];
      });

      polylines[route.route_id] = polyline;
    });

    return polylines;
  }
}

module.exports = new GTFSParser();
```

### Step 3: Create GTFS Loader

```javascript
// backend/src/services/gtfs.loader.js

const gtfsParser = require('./gtfs.parser');
const routeModel = require('../models/route.model');
const stopModel = require('../models/stop.model');
const logger = require('../utils/logger');

class GTFSLoader {
  async loadGTFS(gtfsPath) {
    try {
      logger.info('Starting GTFS load', { path: gtfsPath });

      // Parse all files
      const routes = await gtfsParser.parseRoutes(`${gtfsPath}/routes.txt`);
      const stops = await gtfsParser.parseStops(`${gtfsPath}/stops.txt`);
      const stopTimes = await gtfsParser.parseStopTimes(`${gtfsPath}/stop_times.txt`);
      const trips = await gtfsParser.parseTrips(`${gtfsPath}/trips.txt`);

      logger.info('Parsed GTFS files', {
        routes: routes.length,
        stops: stops.length,
        stopTimes: stopTimes.length,
        trips: trips.length,
      });

      // Build polylines
      const polylines = gtfsParser.buildPolylines(routes, stops, trips, stopTimes);

      // Insert routes with polylines
      for (const route of routes) {
        await routeModel.insert({
          route_id: route.route_id,
          route_name: route.route_long_name || route.route_short_name,
          route_short_name: route.route_short_name,
          agency_id: route.agency_id,
          polyline: polylines[route.route_id] || [],
          route_color: route.route_color,
          route_type: route.route_type,
        });
      }

      logger.info('Inserted routes', { count: routes.length });

      // Insert stops
      for (const stop of stops) {
        await stopModel.insert({
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          latitude: stop.stop_lat,
          longitude: stop.stop_lon,
          stop_code: stop.stop_code,
          wheelchair_boarding: stop.wheelchair_boarding,
        });
      }

      logger.info('Inserted stops', { count: stops.length });

      return {
        success: true,
        routes: routes.length,
        stops: stops.length,
      };
    } catch (err) {
      logger.error('GTFS load error', { message: err.message });
      throw err;
    }
  }
}

module.exports = new GTFSLoader();
```

### Step 4: Create API Endpoint to Load GTFS

```javascript
// backend/src/api/controllers/gtfs.controller.js

const gtfsLoader = require('../../services/gtfs.loader');
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
}

module.exports = GTFSController;
```

### Step 5: Create Realtime Vehicle Simulator

```javascript
// backend/src/services/india.bus.simulator.js

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class IndiaBusSimulator {
  constructor(ingestService) {
    this.ingestService = ingestService;
    this.activeVehicles = new Map();
    this.simulationInterval = null;
    this.isRunning = false;
  }

  /**
   * Start simulation for a route
   */
  startRouteSimulation(routeId, routeData) {
    if (this.activeVehicles.has(routeId)) {
      logger.warn(`Route ${routeId} already simulating`);
      return;
    }

    // Create 2-3 buses per route
    const busCount = Math.ceil(routeData.stops.length / 10);
    
    for (let i = 0; i < busCount; i++) {
      const vehicleId = `DL${String(i + 1).padStart(2, '0')}${routeId}`;
      
      const vehicle = {
        vehicleId,
        routeId,
        coordinates: routeData.polyline,
        stops: routeData.stops,
        currentIndex: Math.floor(Math.random() * routeData.polyline.length),
        speed: 12 + Math.random() * 8, // 12-20 m/s
        heading: 0,
        networkQuality: 90 + Math.random() * 10,
        lastUpdate: Date.now(),
      };

      this.activeVehicles.set(vehicleId, vehicle);
      logger.info(`Started simulation for vehicle ${vehicleId}`);
    }
  }

  /**
   * Start all simulations
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.simulationInterval = setInterval(() => {
      this.updateAllVehicles();
    }, 2000); // Update every 2 seconds

    logger.info('India bus simulator started');
  }

  /**
   * Update all vehicles
   */
  updateAllVehicles() {
    for (const [vehicleId, vehicle] of this.activeVehicles) {
      this.updateVehiclePosition(vehicleId, vehicle);
    }
  }

  /**
   * Update single vehicle position
   */
  updateVehiclePosition(vehicleId, vehicle) {
    const { coordinates, stops, speed } = vehicle;

    if (vehicle.currentIndex >= coordinates.length - 1) {
      vehicle.currentIndex = 0;
    }

    const current = coordinates[vehicle.currentIndex];
    const next = coordinates[vehicle.currentIndex + 1];

    // Interpolate position
    const segmentDistance = this.haversineDistance(current, next);
    const timePerSegment = segmentDistance / speed;
    const timeSinceLastUpdate = (Date.now() - vehicle.lastUpdate) / 1000;
    const progress = Math.min(timeSinceLastUpdate / timePerSegment, 1);

    const lat = current[1] + (next[1] - current[1]) * progress;
    const lng = current[0] + (next[0] - current[0]) * progress;

    // Find next stop
    const nextStop = this.findNextStop(vehicle, { lat, lng });

    // Create GPS packet
    const packet = {
      vehicle_id: vehicleId,
      latitude: lat,
      longitude: lng,
      speed: speed + (Math.random() - 0.5) * 2,
      heading: this.calculateHeading(current, next),
      timestamp: Date.now(),
      network_quality: vehicle.networkQuality,
      packet_id: uuidv4(),
      route_id: vehicle.routeId,
      next_stop_id: nextStop?.stop_id,
      next_stop_name: nextStop?.stop_name,
    };

    // Send to ingest
    this.ingestService.ingestGPSPacket(packet);

    // Move to next segment
    if (progress >= 1) {
      vehicle.currentIndex++;
      vehicle.lastUpdate = Date.now();
    }
  }

  /**
   * Find next stop
   */
  findNextStop(vehicle, currentPos) {
    const stops = vehicle.stops;
    let closestStop = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const distance = this.haversineDistance(
        [currentPos.lng, currentPos.lat],
        [stop.longitude, stop.latitude]
      );

      if (distance < minDistance && distance > 50) { // At least 50m ahead
        minDistance = distance;
        closestStop = stop;
      }
    }

    return closestStop;
  }

  /**
   * Haversine distance
   */
  haversineDistance(coord1, coord2) {
    const R = 6371000;
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate heading
   */
  calculateHeading(from, to) {
    const dLng = ((to[0] - from[0]) * Math.PI) / 180;
    const lat1 = (from[1] * Math.PI) / 180;
    const lat2 = (to[1] * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const heading = (Math.atan2(y, x) * 180) / Math.PI;

    return (heading + 360) % 360;
  }

  stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    logger.info('India bus simulator stopped');
  }
}

module.exports = IndiaBusSimulator;
```

### Step 6: Update Server to Load GTFS

```javascript
// backend/src/server.js (add this)

const gtfsLoader = require('./services/gtfs.loader');
const IndiaBusSimulator = require('./services/india.bus.simulator');

// Load GTFS on startup
async function initializeGTFS() {
  try {
    const gtfsPath = process.env.GTFS_PATH || './data/gtfs';
    const result = await gtfsLoader.loadGTFS(gtfsPath);
    logger.info('GTFS loaded successfully', result);

    // Start simulator for each route
    const routes = await routeService.getAllRoutes();
    const simulator = new IndiaBusSimulator(ingestService);
    
    routes.forEach(route => {
      simulator.startRouteSimulation(route.route_id, route);
    });
    
    simulator.start();
  } catch (err) {
    logger.warn('GTFS load failed, using predefined routes', { error: err.message });
  }
}

// Call on startup
initializeGTFS();
```

### Step 7: Install CSV Parser

```bash
cd backend
npm install csv-parser
```

### Step 8: Update Frontend for Indian Cities

```html
<!-- live-map.html -->
<script>
  // Initialize map for Delhi
  const map = L.map('map').setView([28.6329, 77.2197], 12);
  
  // Add city selector
  const cities = {
    'delhi': { lat: 28.6329, lng: 77.2197, zoom: 12 },
    'bangalore': { lat: 12.9716, lng: 77.5946, zoom: 12 },
    'mumbai': { lat: 19.0760, lng: 72.8777, zoom: 12 },
  };
  
  function switchCity(cityName) {
    const city = cities[cityName];
    map.setView([city.lat, city.lng], city.zoom);
    loadRoutesForCity(cityName);
  }
  
  async function loadRoutesForCity(cityName) {
    const routes = await fetch(`/api/routes?city=${cityName}`).then(r => r.json());
    // Draw routes...
  }
</script>
```

---

## DEPLOYMENT CHECKLIST

- [ ] Download GTFS data
- [ ] Install csv-parser
- [ ] Create GTFS parser service
- [ ] Create GTFS loader service
- [ ] Create GTFS controller
- [ ] Update server to load GTFS
- [ ] Test API endpoints
- [ ] Update frontend for Indian cities
- [ ] Deploy to production

---

## TESTING

```bash
# Test GTFS load
curl -X POST http://localhost:3000/api/gtfs/load \
  -H "Content-Type: application/json" \
  -d '{"gtfsPath":"./data/gtfs"}'

# Get routes
curl http://localhost:3000/api/routes

# Get stops
curl http://localhost:3000/api/stops

# Get vehicles
curl http://localhost:3000/api/vehicles
```

---

## NEXT STEPS

1. Download GTFS data
2. Implement GTFS parser
3. Load data into database
4. Start vehicle simulator
5. Test on frontend
6. Deploy

---

**Status**: ✅ Ready for Implementation  
**Estimated Time**: 2-3 hours  
**Complexity**: Medium
