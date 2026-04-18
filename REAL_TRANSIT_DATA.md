# Real Transit Data Integration - SkedGo TripGo API

## Overview

Your transport tracking system now integrates with the **SkedGo TripGo API** to fetch real transit data including:
- Real transit routes and schedules
- Live vehicle positions
- Transit agencies and stops
- Location geocoding

## API Credentials

The system uses your RapidAPI credentials:
```
API Host: skedgo-tripgo-v1.p.rapidapi.com
API Key: 172ce50614msh088b79d4adb32d2p12b5b1jsn21a9c7806f2f
```

## New Endpoints

### 1. Search Locations

**Endpoint**: `GET /api/transit/search?q=Times Square`

**Description**: Geocode a location to get coordinates

**Query Parameters**:
- `q` (required) - Location query string

**Response**:
```json
{
  "success": true,
  "query": "Times Square",
  "locations": [
    {
      "id": "loc_123",
      "name": "Times Square",
      "address": "Times Square, New York, NY",
      "latitude": 40.7484,
      "longitude": -73.9857,
      "type": "landmark"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/transit/search?q=Times%20Square"
```

---

### 2. Get Transit Routes

**Endpoint**: `GET /api/transit/routes?fromLat=40.7484&fromLng=-73.9857&toLat=40.7128&toLng=-74.0060`

**Description**: Get transit routes between two locations

**Query Parameters**:
- `fromLat` (required) - Starting latitude
- `fromLng` (required) - Starting longitude
- `toLat` (required) - Destination latitude
- `toLng` (required) - Destination longitude

**Response**:
```json
{
  "success": true,
  "from": { "lat": "40.7484", "lng": "-73.9857" },
  "to": { "lat": "40.7128", "lng": "-74.0060" },
  "routes": [
    {
      "id": "route_123",
      "name": "Downtown Express",
      "duration": 1800,
      "distance": 5000,
      "stops": 6,
      "polyline": [[-73.9857, 40.7484], [-73.9776, 40.7505]],
      "segments": []
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/transit/routes?fromLat=40.7484&fromLng=-73.9857&toLat=40.7128&toLng=-74.0060"
```

---

### 3. Get Vehicle Positions

**Endpoint**: `GET /api/transit/vehicles?routeId=route_001`

**Description**: Get real-time vehicle positions for a route

**Query Parameters**:
- `routeId` (required) - Route identifier

**Response**:
```json
{
  "success": true,
  "routeId": "route_001",
  "vehicles": [
    {
      "id": "vehicle_123",
      "latitude": 40.7500,
      "longitude": -73.9800,
      "heading": 45,
      "speed": 15.2,
      "timestamp": "2026-04-18T21:00:00Z"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/transit/vehicles?routeId=route_001"
```

---

### 4. Get Transit Agencies

**Endpoint**: `GET /api/transit/agencies?lat=40.7484&lng=-73.9857`

**Description**: Get transit agencies in an area

**Query Parameters**:
- `lat` (required) - Latitude
- `lng` (required) - Longitude

**Response**:
```json
{
  "success": true,
  "location": { "lat": "40.7484", "lng": "-73.9857" },
  "agencies": [
    {
      "id": "agency_123",
      "name": "MTA New York City Transit",
      "region": "New York",
      "timezone": "America/New_York",
      "website": "https://new.mta.info"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/transit/agencies?lat=40.7484&lng=-73.9857"
```

---

### 5. Get Route Stops

**Endpoint**: `GET /api/transit/stops?routeId=route_001`

**Description**: Get all stops for a route

**Query Parameters**:
- `routeId` (required) - Route identifier

**Response**:
```json
{
  "success": true,
  "routeId": "route_001",
  "stops": [
    {
      "id": "stop_001",
      "name": "Times Square",
      "latitude": 40.7484,
      "longitude": -73.9857,
      "sequence": 1,
      "arrivalTime": "2026-04-18T21:00:00Z",
      "departureTime": "2026-04-18T21:02:00Z"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/transit/stops?routeId=route_001"
```

---

## Usage Examples

### JavaScript

```javascript
// Search for a location
async function searchLocation(query) {
  const response = await fetch(`http://localhost:3000/api/transit/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  console.log('Locations:', data.locations);
  return data.locations;
}

// Get routes between two locations
async function getRoutes(fromLat, fromLng, toLat, toLng) {
  const url = new URL('http://localhost:3000/api/transit/routes');
  url.searchParams.append('fromLat', fromLat);
  url.searchParams.append('fromLng', fromLng);
  url.searchParams.append('toLat', toLat);
  url.searchParams.append('toLng', toLng);

  const response = await fetch(url);
  const data = await response.json();
  console.log('Routes:', data.routes);
  return data.routes;
}

// Get vehicle positions
async function getVehicles(routeId) {
  const response = await fetch(`http://localhost:3000/api/transit/vehicles?routeId=${routeId}`);
  const data = await response.json();
  console.log('Vehicles:', data.vehicles);
  return data.vehicles;
}

// Get agencies
async function getAgencies(lat, lng) {
  const url = new URL('http://localhost:3000/api/transit/agencies');
  url.searchParams.append('lat', lat);
  url.searchParams.append('lng', lng);

  const response = await fetch(url);
  const data = await response.json();
  console.log('Agencies:', data.agencies);
  return data.agencies;
}

// Get stops
async function getStops(routeId) {
  const response = await fetch(`http://localhost:3000/api/transit/stops?routeId=${routeId}`);
  const data = await response.json();
  console.log('Stops:', data.stops);
  return data.stops;
}

// Example usage
(async () => {
  // Search for Times Square
  const locations = await searchLocation('Times Square');
  
  if (locations.length > 0) {
    const timesSquare = locations[0];
    
    // Get agencies in that area
    const agencies = await getAgencies(timesSquare.latitude, timesSquare.longitude);
    console.log('Found agencies:', agencies);
    
    // Get routes from Times Square to Battery Park
    const routes = await getRoutes(
      timesSquare.latitude,
      timesSquare.longitude,
      40.7128,
      -74.0060
    );
    console.log('Found routes:', routes);
  }
})();
```

---

## Integration with Live Map

To use real transit data in the live map:

1. **Search for locations**
   ```javascript
   const locations = await fetch('/api/transit/search?q=Times Square').then(r => r.json());
   ```

2. **Get routes between locations**
   ```javascript
   const routes = await fetch('/api/transit/routes?fromLat=40.7484&fromLng=-73.9857&toLat=40.7128&toLng=-74.0060').then(r => r.json());
   ```

3. **Display routes on map**
   ```javascript
   routes.routes.forEach(route => {
     L.polyline(route.polyline.map(c => [c[1], c[0]]), {
       color: '#667eea',
       weight: 3
     }).addTo(map);
   });
   ```

4. **Get vehicle positions**
   ```javascript
   const vehicles = await fetch(`/api/transit/vehicles?routeId=${routeId}`).then(r => r.json());
   ```

5. **Display vehicles on map**
   ```javascript
   vehicles.vehicles.forEach(vehicle => {
     L.marker([vehicle.latitude, vehicle.longitude]).addTo(map);
   });
   ```

---

## Real-World Scenarios

### Scenario 1: Find Routes from Home to Work

```javascript
async function findCommute() {
  // Search for home location
  const homeLocations = await fetch('/api/transit/search?q=123 Main Street').then(r => r.json());
  const home = homeLocations.locations[0];

  // Search for work location
  const workLocations = await fetch('/api/transit/search?q=Empire State Building').then(r => r.json());
  const work = workLocations.locations[0];

  // Get routes
  const routes = await fetch(
    `/api/transit/routes?fromLat=${home.latitude}&fromLng=${home.longitude}&toLat=${work.latitude}&toLng=${work.longitude}`
  ).then(r => r.json());

  console.log('Commute options:', routes.routes);
}
```

### Scenario 2: Track Live Buses on a Route

```javascript
async function trackBuses(routeId) {
  setInterval(async () => {
    const vehicles = await fetch(`/api/transit/vehicles?routeId=${routeId}`).then(r => r.json());
    
    // Update map with vehicle positions
    vehicles.vehicles.forEach(vehicle => {
      updateVehicleMarker(vehicle.id, vehicle.latitude, vehicle.longitude, vehicle.heading);
    });
  }, 5000); // Update every 5 seconds
}
```

### Scenario 3: Get All Stops on a Route

```javascript
async function displayStops(routeId) {
  const stops = await fetch(`/api/transit/stops?routeId=${routeId}`).then(r => r.json());
  
  stops.stops.forEach(stop => {
    L.circleMarker([stop.latitude, stop.longitude], {
      radius: 6,
      fillColor: '#667eea',
      color: '#fff',
      weight: 2
    }).bindPopup(stop.name).addTo(map);
  });
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Example error handling**:

```javascript
async function safeApiCall(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.error('API error:', data.error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Network error:', err);
    return null;
  }
}
```

---

## Rate Limiting

The SkedGo API has rate limits:
- **Free tier**: 100 requests per day
- **Pro tier**: 1000 requests per day

Monitor your usage and consider caching results.

---

## Caching Strategy

To reduce API calls:

```javascript
const cache = new Map();

async function getCachedRoutes(fromLat, fromLng, toLat, toLng) {
  const key = `${fromLat},${fromLng},${toLat},${toLng}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const routes = await fetch(
    `/api/transit/routes?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`
  ).then(r => r.json());
  
  cache.set(key, routes);
  
  // Clear cache after 1 hour
  setTimeout(() => cache.delete(key), 3600000);
  
  return routes;
}
```

---

## Troubleshooting

### "API Key Invalid"
- Verify your RapidAPI key is correct
- Check that the key hasn't expired
- Ensure you have API credits

### "Rate limit exceeded"
- Wait before making more requests
- Implement caching
- Consider upgrading your RapidAPI plan

### "No results found"
- Try different search terms
- Check coordinates are valid
- Verify the location has transit service

---

## Next Steps

1. **Test the endpoints** using curl or Postman
2. **Integrate with live map** to show real routes
3. **Cache results** to reduce API calls
4. **Monitor usage** to stay within rate limits
5. **Customize UI** to display real transit data

---

## Support

For SkedGo API issues:
- Visit: https://rapidapi.com/skedgo/api/skedgo-tripgo-v1
- Check API documentation
- Review rate limits and pricing

---

**Status**: ✅ Real Transit Data Integration Ready  
**Last Updated**: April 18, 2026
