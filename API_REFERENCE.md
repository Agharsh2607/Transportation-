# API Reference - Real-Time Transport Tracking

## Base URL
```
http://localhost:3000/api
```

## Simulation Control Endpoints

### Start GPS Simulation

**Endpoint**: `POST /simulation/start`

**Description**: Start GPS simulation for a vehicle on a route

**Request Body**:
```json
{
  "vehicleId": "BUS-001",
  "routeId": "route_001"
}
```

**Response**:
```json
{
  "success": true,
  "message": "GPS simulation started for vehicle BUS-001",
  "vehicleId": "BUS-001",
  "routeId": "route_001"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001","routeId":"route_001"}'
```

---

### Stop GPS Simulation

**Endpoint**: `POST /simulation/stop`

**Description**: Stop GPS simulation for a vehicle

**Request Body**:
```json
{
  "vehicleId": "BUS-001"
}
```

**Response**:
```json
{
  "success": true,
  "message": "GPS simulation stopped for vehicle BUS-001"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/simulation/stop \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001"}'
```

---

### Get Simulation Status

**Endpoint**: `GET /simulation/status`

**Description**: Get current simulation status

**Response**:
```json
{
  "isRunning": true,
  "activeVehicles": 3
}
```

**Example**:
```bash
curl http://localhost:3000/api/simulation/status
```

---

### Get All Routes

**Endpoint**: `GET /simulation/routes`

**Description**: Get all available routes with stops and polylines

**Response**:
```json
[
  {
    "id": "route_001",
    "name": "Downtown Express",
    "description": "Main downtown loop",
    "polyline": [
      [-73.9857, 40.7484],
      [-73.9776, 40.7505],
      ...
    ],
    "stops": [
      {
        "id": "stop_001",
        "name": "Times Square",
        "latitude": 40.7484,
        "longitude": -73.9857,
        "sequence": 1
      },
      ...
    ]
  },
  ...
]
```

**Example**:
```bash
curl http://localhost:3000/api/simulation/routes
```

---

### Get Live Vehicles

**Endpoint**: `GET /simulation/vehicles`

**Description**: Get all live vehicle data

**Response**:
```json
[
  {
    "vehicle_id": "BUS-001",
    "latitude": 40.7484,
    "longitude": -73.9857,
    "speed": 15.2,
    "heading": 45,
    "route_id": "route_001",
    "eta_next_stop": 5,
    "next_stop_name": "Grand Central",
    "status": "active",
    "network_quality": 95,
    "last_seen": "2026-04-18T21:00:00Z"
  },
  ...
]
```

**Example**:
```bash
curl http://localhost:3000/api/simulation/vehicles
```

---

## GPS Packet Format

### Ingest GPS Data

**Endpoint**: `POST /ingest`

**Description**: Ingest GPS packets from driver mobile apps

**Request Body**:
```json
{
  "vehicle_id": "BUS-001",
  "latitude": 40.7484,
  "longitude": -73.9857,
  "speed": 15.2,
  "heading": 45,
  "timestamp": 1713459600000,
  "network_quality": 95,
  "packet_id": "uuid-string"
}
```

**Response**:
```json
{
  "accepted": 1,
  "skipped": 0
}
```

**Field Descriptions**:
- `vehicle_id` (string, required): Unique vehicle identifier
- `latitude` (number, required): GPS latitude (-90 to 90)
- `longitude` (number, required): GPS longitude (-180 to 180)
- `speed` (number, required): Speed in m/s
- `heading` (number, required): Direction in degrees (0-360)
- `timestamp` (number, required): Unix timestamp in milliseconds
- `network_quality` (number, optional): Signal strength 0-100%
- `packet_id` (string, optional): Unique packet identifier

**Example**:
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "BUS-001",
    "latitude": 40.7484,
    "longitude": -73.9857,
    "speed": 15.2,
    "heading": 45,
    "timestamp": 1713459600000,
    "network_quality": 95,
    "packet_id": "pkt-001"
  }'
```

---

## WebSocket Events

### Connection

**Event**: `welcome`

**Description**: Sent when client connects

**Payload**:
```json
{
  "type": "welcome",
  "message": "Connected to Transit Live Updates...",
  "timestamp": "2026-04-18T21:00:00Z"
}
```

---

### Subscribe to Route

**Send**:
```json
{
  "action": "subscribe",
  "routeId": "route_001"
}
```

**Response**:
```json
{
  "type": "subscribed",
  "routeId": "route_001"
}
```

---

### Vehicle Update

**Event**: `vehicle_update`

**Description**: Real-time vehicle position update

**Payload**:
```json
{
  "type": "vehicle_update",
  "vehicle": {
    "vehicle_id": "BUS-001",
    "latitude": 40.7484,
    "longitude": -73.9857,
    "speed": 15.2,
    "heading": 45,
    "route_id": "route_001",
    "eta_next_stop": 5,
    "next_stop_name": "Grand Central",
    "status": "active",
    "network_quality": 95,
    "timestamp": "2026-04-18T21:00:00Z"
  }
}
```

---

### Alert

**Event**: `alert`

**Description**: Delay or alert notification

**Payload**:
```json
{
  "type": "alert",
  "data": {
    "vehicle_id": "BUS-001",
    "alert_type": "delay",
    "message": "Bus delayed by 5 minutes",
    "timestamp": "2026-04-18T21:00:00Z"
  }
}
```

---

## Route Data Structure

### Route Object

```json
{
  "id": "route_001",
  "name": "Downtown Express",
  "description": "Main downtown loop",
  "polyline": [
    [-73.9857, 40.7484],
    [-73.9776, 40.7505],
    [-73.9680, 40.7549]
  ],
  "stops": [
    {
      "id": "stop_001",
      "name": "Times Square",
      "latitude": 40.7484,
      "longitude": -73.9857,
      "sequence": 1
    },
    {
      "id": "stop_002",
      "name": "Grand Central",
      "latitude": 40.7527,
      "longitude": -73.9772,
      "sequence": 2
    }
  ]
}
```

---

## Vehicle State Structure

### Vehicle State Object

```json
{
  "vehicle_id": "BUS-001",
  "latitude": 40.7484,
  "longitude": -73.9857,
  "speed": 15.2,
  "heading": 45,
  "route_id": "route_001",
  "eta_next_stop": 5,
  "next_stop_name": "Grand Central",
  "status": "active",
  "network_quality": 95,
  "last_seen": "2026-04-18T21:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "vehicleId and routeId are required"
}
```

### 404 Not Found

```json
{
  "error": "Route not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error message"
}
```

---

## Rate Limiting

- **Global Rate Limit**: 100 requests per minute
- **Vehicle Ingest**: 1000 packets per minute per vehicle
- **WebSocket**: No limit (real-time)

---

## Performance Metrics

- **GPS Update Frequency**: 2 seconds
- **WebSocket Latency**: <100ms
- **ETA Calculation**: <50ms
- **Map Rendering**: 60 FPS
- **Concurrent Vehicles**: 100+

---

## Integration Example

### JavaScript

```javascript
// Start tracking
async function startTracking() {
  const response = await fetch('http://localhost:3000/api/simulation/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleId: 'BUS-001',
      routeId: 'route_001'
    })
  });
  const data = await response.json();
  console.log(data);
}

// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'vehicle_update') {
    console.log('Vehicle position:', data.vehicle);
  }
};

// Send GPS packet
async function sendGPS(packet) {
  const response = await fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packet)
  });
  const result = await response.json();
  console.log('Ingest result:', result);
}
```

---

## Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-18T21:00:00Z"
}
```

---

## Notes

- All timestamps are in ISO 8601 format or Unix milliseconds
- Coordinates use WGS84 (latitude, longitude)
- Speed is in meters per second (m/s)
- Heading is in degrees (0-360, where 0 is North)
- Network quality is 0-100%
- ETA is in minutes

---

## Support

For API issues:
1. Check the backend logs
2. Verify request format
3. Check response status code
4. Review error message

---

**Last Updated**: April 18, 2026  
**Version**: 1.0.0
