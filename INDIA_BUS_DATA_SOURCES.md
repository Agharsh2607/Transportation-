# Real Indian Bus Tracking System - Data Sources & Architecture

## PART 1: REAL DATA SOURCES IN INDIA

### 1. DELHI - Delhi Transport Corporation (DTC)

**Source**: Delhi Open Data Portal + DTC API
- **Type**: Static (GTFS) + Limited Realtime
- **Access**: 
  - GTFS: https://data.gov.in/resource/delhi-bus-routes-and-stops
  - API: DTC doesn't have official public API, but data available via:
    - Google Maps (embedded)
    - Third-party aggregators
- **Data Available**:
  - Routes: 600+ bus routes
  - Stops: 5000+ stops
  - Static schedules
- **Realtime**: Limited (not official)
- **Free**: Yes
- **Reliability**: Good for static, Limited for realtime
- **Format**: GTFS (CSV files)

**Download Link**: https://data.gov.in/resource/delhi-bus-routes-and-stops

---

### 2. BANGALORE - BMTC (Bangalore Metropolitan Transport Corporation)

**Source**: BMTC Official + Google Transit
- **Type**: Static GTFS + Google Maps integration
- **Access**:
  - GTFS: https://data.gov.in/resource/bangalore-bus-routes-and-stops
  - Realtime: Via Google Maps API (embedded)
- **Data Available**:
  - Routes: 400+ routes
  - Stops: 3000+ stops
  - Live tracking via Google
- **Free**: Yes (GTFS), Paid (Google Maps API)
- **Reliability**: Good
- **Format**: GTFS

**Download Link**: https://data.gov.in/resource/bangalore-bus-routes-and-stops

---

### 3. MUMBAI - BEST (Brihanmumbai Electric Supply and Transport)

**Source**: BEST Official Portal
- **Type**: Static GTFS
- **Access**:
  - GTFS: https://data.gov.in/resource/mumbai-bus-routes-and-stops
  - Website: https://www.bestundertaking.com/
- **Data Available**:
  - Routes: 350+ routes
  - Stops: 3000+ stops
  - Schedules
- **Realtime**: Not available officially
- **Free**: Yes
- **Reliability**: Good for static
- **Format**: GTFS

**Download Link**: https://data.gov.in/resource/mumbai-bus-routes-and-stops

---

### 4. KOLKATA - WBTC (West Bengal Transport Corporation)

**Source**: data.gov.in
- **Type**: Static GTFS
- **Access**: https://data.gov.in/resource/kolkata-bus-routes-and-stops
- **Data Available**:
  - Routes: 200+ routes
  - Stops: 2000+ stops
- **Realtime**: Not available
- **Free**: Yes
- **Reliability**: Good
- **Format**: GTFS

---

### 5. PUNE - PMPML (Pune Mahanagar Parivahan Mahal Limited)

**Source**: data.gov.in
- **Type**: Static GTFS
- **Access**: https://data.gov.in/resource/pune-bus-routes-and-stops
- **Data Available**:
  - Routes: 200+ routes
  - Stops: 1500+ stops
- **Realtime**: Not available
- **Free**: Yes
- **Reliability**: Good
- **Format**: GTFS

---

### 6. HYDERABAD - TSRTC (Telangana State Road Transport Corporation)

**Source**: data.gov.in
- **Type**: Static GTFS
- **Access**: https://data.gov.in/resource/hyderabad-bus-routes-and-stops
- **Data Available**:
  - Routes: 300+ routes
  - Stops: 2500+ stops
- **Realtime**: Not available
- **Free**: Yes
- **Reliability**: Good
- **Format**: GTFS

---

### 7. GOOGLE TRANSIT API (All Cities)

**Source**: Google Maps Platform
- **Type**: Realtime + Static
- **Access**: Google Maps API (Directions API + Transit)
- **Cost**: Paid ($0.005-0.01 per request)
- **Data**: All major Indian cities
- **Realtime**: Yes (live bus positions)
- **Reliability**: Excellent
- **Format**: JSON

**Endpoint**: https://maps.googleapis.com/maps/api/directions/json?mode=transit

---

### 8. MOOVIT API (Third-Party Aggregator)

**Source**: Moovit (Community-driven transit app)
- **Type**: Realtime + Static
- **Access**: Moovit API (requires partnership)
- **Data**: All major Indian cities
- **Realtime**: Yes
- **Free**: Limited (partnership required)
- **Reliability**: Good
- **Format**: JSON

---

### 9. CITYMAPPER API (Limited India Coverage)

**Source**: Citymapper
- **Type**: Realtime + Static
- **Access**: API (requires key)
- **Coverage**: Limited in India (mainly Delhi, Mumbai)
- **Cost**: Paid
- **Reliability**: Good where available

---

### 10. OPEN STREET MAP (OSM) + GTFS

**Source**: OpenStreetMap + Community GTFS feeds
- **Type**: Static
- **Access**: Free downloads
- **Data**: All cities
- **Realtime**: No
- **Free**: Yes
- **Reliability**: Community-maintained (variable)

**Resources**:
- https://transitfeeds.com/ (GTFS repository)
- https://www.openstreetmap.org/

---

## PART 2: BEST DATA STRATEGY FOR HACKATHON

### Recommended Approach: HYBRID STRATEGY

**Phase 1: Static Data (Immediate)**
- Download GTFS from data.gov.in for chosen city (Delhi/Bangalore)
- Parse routes, stops, schedules
- Load into database
- Display on map

**Phase 2: Simulated Realtime (Quick)**
- Use static schedule data
- Simulate bus movement along routes
- Calculate realistic positions based on time
- Show as "live" with disclaimer

**Phase 3: Real Realtime (If Available)**
- Integrate Google Maps API for actual positions
- Or use community data feeds
- Replace simulated data

### RECOMMENDED CHOICE: **DELHI + GOOGLE MAPS**

**Why**:
- ✓ Best GTFS data available
- ✓ Google Maps has realtime data
- ✓ Largest user base
- ✓ Good for demo
- ✓ Scalable to other cities

**Cost**: Free GTFS + ~$5-10 for Google Maps API (hackathon budget)

---

## PART 3: DATA INGESTION ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GTFS Files   │  │ Google Maps  │  │ Community    │      │
│  │ (data.gov)   │  │ API          │  │ Feeds        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ADAPTER LAYER (Normalize)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Convert all formats to standard schema               │  │
│  │ - Parse GTFS CSV                                     │  │
│  │ - Transform Google API response                      │  │
│  │ - Normalize timestamps                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           DATABASE LAYER (PostgreSQL/Supabase)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Routes       │  │ Stops        │  │ Vehicles     │      │
│  │ (static)     │  │ (static)     │  │ (realtime)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         REALTIME LAYER (WebSocket/Supabase)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Broadcast vehicle updates every 2-5 seconds          │  │
│  │ Calculate ETAs                                        │  │
│  │ Detect delays                                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (Leaflet Map)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - Draw route polylines                               │  │
│  │ - Show stops                                          │  │
│  │ - Animate bus markers                                │  │
│  │ - Display ETA & status                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Details

**1. Initial Load (Once)**
```
GTFS Download → Parse CSV → Insert into DB
- Routes table: route_id, route_name, polyline
- Stops table: stop_id, stop_name, lat, lng
- Trips table: trip_id, route_id, schedule
```

**2. Realtime Updates (Every 2-5 seconds)**
```
Google Maps API → Get vehicle positions → Update DB → WebSocket broadcast
- Vehicle position: vehicle_id, lat, lng, heading, speed
- Calculate next stop
- Calculate ETA
- Detect delays
```

**3. Frontend Updates (Real-time)**
```
WebSocket message → Update marker position → Animate on map
- Smooth animation
- Update sidebar info
- Show status
```

---

## PART 4: STANDARD DATA FORMAT

### Vehicle Schema
```json
{
  "vehicle_id": "DL01AB1234",
  "route_id": "101",
  "route_name": "Connaught Place - Dwarka",
  "latitude": 28.6329,
  "longitude": 77.2197,
  "speed": 25.5,
  "heading": 45,
  "timestamp": "2026-04-18T21:30:00Z",
  "next_stop_id": "stop_123",
  "next_stop_name": "Rajiv Chowk",
  "eta_seconds": 180,
  "status": "live",
  "network_quality": 95,
  "last_updated": "2026-04-18T21:30:00Z"
}
```

### Route Schema
```json
{
  "route_id": "101",
  "route_name": "Connaught Place - Dwarka",
  "route_short_name": "101",
  "agency_id": "DTC",
  "agency_name": "Delhi Transport Corporation",
  "polyline": [
    [28.6329, 77.2197],
    [28.6340, 77.2210],
    [28.6350, 77.2220]
  ],
  "stops": [
    {
      "stop_id": "stop_001",
      "stop_name": "Connaught Place",
      "latitude": 28.6329,
      "longitude": 77.2197,
      "sequence": 1
    }
  ],
  "schedule": {
    "first_departure": "05:30",
    "last_departure": "23:00",
    "frequency_minutes": 10
  }
}
```

### Stop Schema
```json
{
  "stop_id": "stop_001",
  "stop_name": "Connaught Place",
  "latitude": 28.6329,
  "longitude": 77.2197,
  "routes": ["101", "102", "103"],
  "accessibility": true
}
```

---

## PART 5: LIVE MAP INTEGRATION

### Frontend Implementation

```javascript
// 1. Load routes and stops
async function loadRoutes() {
  const routes = await fetch('/api/routes').then(r => r.json());
  
  routes.forEach(route => {
    // Draw polyline
    L.polyline(route.polyline, {
      color: '#667eea',
      weight: 3,
      opacity: 0.7
    }).addTo(map);
    
    // Draw stops
    route.stops.forEach(stop => {
      L.circleMarker([stop.latitude, stop.longitude], {
        radius: 6,
        fillColor: '#fff',
        color: '#667eea',
        weight: 2
      }).bindPopup(stop.stop_name).addTo(map);
    });
  });
}

// 2. Connect to realtime updates
function connectRealtime() {
  const ws = new WebSocket('ws://localhost:3000');
  
  ws.onmessage = (event) => {
    const vehicle = JSON.parse(event.data);
    updateVehicleMarker(vehicle);
  };
}

// 3. Update vehicle marker
function updateVehicleMarker(vehicle) {
  const marker = L.marker([vehicle.latitude, vehicle.longitude], {
    icon: createBusIcon(vehicle.heading)
  });
  
  marker.bindPopup(`
    <strong>${vehicle.route_name}</strong><br/>
    Next: ${vehicle.next_stop_name}<br/>
    ETA: ${vehicle.eta_seconds}s<br/>
    Speed: ${vehicle.speed} km/h
  `);
  
  marker.addTo(map);
}

// 4. Display vehicle info
function showVehicleInfo(vehicle) {
  document.getElementById('vehicle-info').innerHTML = `
    <div class="vehicle-card">
      <h3>${vehicle.route_name}</h3>
      <p>Next Stop: ${vehicle.next_stop_name}</p>
      <p>ETA: ${formatTime(vehicle.eta_seconds)}</p>
      <p>Speed: ${vehicle.speed} km/h</p>
      <p>Status: ${vehicle.status}</p>
      <p>Last Updated: ${formatTime(Date.now() - new Date(vehicle.last_updated))}</p>
    </div>
  `;
}
```

---

## PART 6: ETA SYSTEM

### If API Provides ETA
```javascript
// Use directly from API
eta_seconds = vehicle.eta_from_api;
```

### If Not Available - Calculate
```javascript
function calculateETA(vehicle, nextStop) {
  // Distance from vehicle to next stop (Haversine)
  const distance = haversineDistance(
    vehicle.latitude, vehicle.longitude,
    nextStop.latitude, nextStop.longitude
  );
  
  // Current speed (m/s)
  const speed = vehicle.speed / 3.6; // Convert km/h to m/s
  
  // ETA in seconds
  const eta = distance / speed;
  
  return eta;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## PART 7: RESILIENCE LOGIC

### Status Detection
```javascript
function getVehicleStatus(vehicle) {
  const timeSinceUpdate = (Date.now() - new Date(vehicle.last_updated)) / 1000;
  
  if (timeSinceUpdate < 10) {
    return 'live';      // Green
  } else if (timeSinceUpdate < 30) {
    return 'delayed';   // Yellow
  } else {
    return 'offline';   // Red
  }
}
```

### Error Handling
```javascript
// Retry logic for API calls
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Fallback to cached data
let cachedVehicles = [];

async function getVehicles() {
  try {
    const vehicles = await fetchWithRetry('/api/vehicles');
    cachedVehicles = vehicles;
    return vehicles;
  } catch (err) {
    console.warn('Using cached vehicle data');
    return cachedVehicles;
  }
}
```

---

## PART 8: HACKATHON-READY IMPLEMENTATION

### Fastest Setup (30 minutes)

**Step 1: Download GTFS (5 min)**
```bash
# Download Delhi GTFS
wget https://data.gov.in/resource/delhi-bus-routes-and-stops
unzip delhi-gtfs.zip
```

**Step 2: Parse & Load (10 min)**
```javascript
// Parse GTFS CSV
const routes = parseCSV('routes.txt');
const stops = parseCSV('stops.txt');
const stopTimes = parseCSV('stop_times.txt');

// Insert into DB
await db.routes.insertMany(routes);
await db.stops.insertMany(stops);
```

**Step 3: Create API (10 min)**
```javascript
// Express endpoints
app.get('/api/routes', async (req, res) => {
  const routes = await db.routes.find();
  res.json(routes);
});

app.get('/api/vehicles', async (req, res) => {
  const vehicles = await db.vehicles.find();
  res.json(vehicles);
});
```

**Step 4: Frontend Map (5 min)**
```html
<div id="map"></div>
<script>
  const map = L.map('map').setView([28.6329, 77.2197], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // Load routes
  fetch('/api/routes').then(r => r.json()).then(routes => {
    routes.forEach(route => {
      L.polyline(route.polyline).addTo(map);
    });
  });
</script>
```

### Minimal Setup Checklist
- [ ] Download GTFS data
- [ ] Parse CSV files
- [ ] Create database schema
- [ ] Build 3 API endpoints (routes, stops, vehicles)
- [ ] Create Leaflet map
- [ ] Add WebSocket for realtime
- [ ] Deploy

---

## PART 9: COMPLETE INTEGRATION FLOW

### Backend Setup
```
1. Download GTFS from data.gov.in
2. Parse CSV files
3. Normalize to standard schema
4. Insert into PostgreSQL
5. Create REST API endpoints
6. Add WebSocket server
7. Implement ETA calculation
8. Add resilience logic
```

### Frontend Setup
```
1. Initialize Leaflet map
2. Load routes and draw polylines
3. Load stops and draw markers
4. Connect to WebSocket
5. Update vehicle markers in realtime
6. Display vehicle info sidebar
7. Add status indicators
```

### Data Flow
```
GTFS CSV → Parser → DB → API → Frontend
                ↓
         WebSocket → Realtime Updates
```

---

## PART 10: RECOMMENDED IMPLEMENTATION PLAN

### For Hackathon (48 hours)

**Day 1 - Morning (4 hours)**
- [ ] Download Delhi GTFS
- [ ] Parse and load into DB
- [ ] Create basic API

**Day 1 - Afternoon (4 hours)**
- [ ] Build Leaflet map
- [ ] Display routes and stops
- [ ] Add vehicle markers

**Day 1 - Evening (4 hours)**
- [ ] Implement WebSocket
- [ ] Add realtime updates
- [ ] Simulate vehicle movement

**Day 2 - Morning (4 hours)**
- [ ] Add ETA calculation
- [ ] Implement status detection
- [ ] Add error handling

**Day 2 - Afternoon (4 hours)**
- [ ] Polish UI
- [ ] Add vehicle info panel
- [ ] Test and debug

**Day 2 - Evening (4 hours)**
- [ ] Deploy
- [ ] Demo preparation
- [ ] Documentation

---

## SUMMARY

### Best Choice: **DELHI + GTFS + SIMULATED REALTIME**

**Why**:
- ✓ Free GTFS data available
- ✓ Easy to parse and load
- ✓ Can simulate realtime quickly
- ✓ Scalable to real APIs later
- ✓ Perfect for hackathon

### Data Sources Priority
1. **Primary**: Delhi GTFS (data.gov.in)
2. **Secondary**: Google Maps API (if budget allows)
3. **Fallback**: Simulated realtime

### Architecture
- PostgreSQL for static data
- WebSocket for realtime
- Leaflet for map
- Node.js backend

### Timeline
- Setup: 30 minutes
- Development: 16 hours
- Testing: 2 hours
- Demo: Ready

---

**Status**: ✅ Ready for Implementation  
**Complexity**: Low  
**Cost**: Free (GTFS) + Optional ($5-10 for Google Maps)  
**Scalability**: High
