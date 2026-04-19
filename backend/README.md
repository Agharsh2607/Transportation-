# Resilient Public Transport Tracking System — Backend

Node.js + Express + PostgreSQL + Redis + WebSockets backend for real-time vehicle tracking, ETA prediction, and delay alerting.

---

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)
```

### 3. Start PostgreSQL and Redis

```bash
docker-compose up postgres redis -d
```

The SQL migration (`src/db/migrations/001_initial.sql`) runs automatically on first start and seeds 2 routes, 5 stops, and 3 vehicles.

### 4. Start the backend

```bash
npm run dev       # development (nodemon)
npm start         # production
```

Or run everything together:

```bash
docker-compose up --build
```

---

## API Endpoints

### Health

| Method | Path      | Description              |
|--------|-----------|--------------------------|
| GET    | /health   | Returns `{ status: "ok", timestamp }` |

---

### GPS Ingest

| Method | Path        | Auth           | Description                        |
|--------|-------------|----------------|------------------------------------|
| POST   | /api/ingest | Bearer token   | Submit one or many GPS packets     |

**Request body (single packet):**
```json
{
  "vehicle_id": "vehicle-1",
  "lat": 51.5074,
  "lng": -0.1278,
  "speed_kmh": 32.5,
  "heading": 90,
  "seq": 1001,
  "replayed": false,
  "signal_strength": "good",
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

**Request body (batch):**
```json
[
  { "vehicle_id": "vehicle-1", "lat": 51.5074, "lng": -0.1278, "speed_kmh": 32.5, "heading": 90, "seq": 1001, "signal_strength": "good", "timestamp": "2024-01-15T08:30:00.000Z" },
  { "vehicle_id": "vehicle-1", "lat": 51.5080, "lng": -0.1260, "speed_kmh": 28.0, "heading": 85, "seq": 1002, "signal_strength": "good", "timestamp": "2024-01-15T08:30:05.000Z" }
]
```

**Headers:**
```
Authorization: Bearer vehicle_secret_key_change_in_prod
Content-Type: application/json
```

**Response (202):**
```json
{
  "accepted": 2,
  "skipped": 0,
  "timestamp": "2024-01-15T08:30:00.123Z"
}
```

---

### Vehicles

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | /api/vehicles                 | List all vehicles (with route name)      |
| GET    | /api/vehicles/:id             | Get vehicle by ID (includes live state)  |
| GET    | /api/vehicles/route/:routeId  | Get all vehicles on a route              |
| POST   | /api/vehicles                 | Register a new vehicle                   |
| PATCH  | /api/vehicles/:id/status      | Update vehicle operational status        |

**POST /api/vehicles body:**
```json
{
  "id": "vehicle-4",
  "registration_number": "TFL-004-D",
  "model": "Volvo B5LH",
  "capacity": 87,
  "route_id": "route-1",
  "driver_name": "Alice Johnson"
}
```

**PATCH /api/vehicles/:id/status body:**
```json
{ "status": "maintenance" }
```

---

### Routes

| Method | Path                      | Description                                    |
|--------|---------------------------|------------------------------------------------|
| GET    | /api/routes               | List all active routes                         |
| GET    | /api/routes/:id           | Get route by ID (includes stops array)         |
| GET    | /api/routes/:id/vehicles  | Get route with live vehicle states from Redis  |
| GET    | /api/routes/:id/stops     | Get ordered stops for a route                  |

---

### Stops

| Method | Path                              | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | /api/stops                        | List all stops                       |
| GET    | /api/stops/:id                    | Get stop by ID                       |
| GET    | /api/stops/nearby?lat=&lng=&radius= | Find stops within radius (km)      |

**Example:** `GET /api/stops/nearby?lat=51.5074&lng=-0.1278&radius=2`

---

### ETA

| Method | Path                  | Description                                          |
|--------|-----------------------|------------------------------------------------------|
| GET    | /api/eta/:vehicleId   | Get ETA predictions for all stops on vehicle's route |

**Response:**
```json
{
  "vehicle_id": "vehicle-1",
  "route_id": "route-1",
  "count": 4,
  "data": [
    {
      "stopId": "stop-2",
      "stopName": "Market Square",
      "etaMin": 4,
      "confidence": "high",
      "distanceKm": 0.8,
      "avgSpeedKmh": 28.5,
      "trafficFactor": 1.4
    }
  ]
}
```

---

## WebSocket

Connect to `ws://localhost:3000` (same port as HTTP).

### Message Format

**Subscribe to a route's live updates:**
```json
{ "action": "subscribe", "routeId": "route-1" }
```

**Unsubscribe:**
```json
{ "action": "unsubscribe", "routeId": "route-1" }
```

### Server Messages

**Welcome (on connect):**
```json
{
  "type": "welcome",
  "message": "Connected to Transit Live Updates...",
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

**Position update (pushed when a vehicle sends a GPS ping):**
```json
{
  "type": "position_update",
  "data": {
    "vehicle_id": "vehicle-1",
    "lat": 51.5080,
    "lng": -0.1260,
    "speed": 32.5,
    "heading": 90,
    "route_id": "route-1",
    "eta_next_stop": 4,
    "status": "active",
    "timestamp": "2024-01-15T08:30:05.000Z"
  }
}
```

**Delay alert:**
```json
{
  "type": "alert",
  "data": {
    "type": "delay",
    "vehicle_id": "vehicle-1",
    "stop_id": "stop-3",
    "stop_name": "University Campus",
    "eta_min": 18,
    "threshold_min": 10,
    "message": "Vehicle vehicle-1 is 18 min away from stop \"University Campus\" — possible delay.",
    "timestamp": "2024-01-15T08:30:05.000Z"
  }
}
```

---

## Architecture Notes

- **GPS Ingest → Queue → Processor**: Packets are accepted via HTTP, deduplicated via Redis Sets, queued in-memory, and processed every 500ms by the queue consumer.
- **ETA Engine**: Uses Haversine distance + historical average speed (from DB) + rule-based traffic factor. Confidence is `high` when historical data exists, `medium` otherwise.
- **Redis Cache**: Vehicle state (30s TTL), stop ETAs (15s TTL), active vehicle sorted set, duplicate sequence detection (1h TTL).
- **WebSocket Rooms**: Clients subscribe to route IDs. Position updates and alerts are relayed from Redis Pub/Sub to the relevant room.
- **Graceful Shutdown**: SIGTERM/SIGINT closes HTTP server, WebSocket server, Redis connections, and PostgreSQL pool cleanly.
