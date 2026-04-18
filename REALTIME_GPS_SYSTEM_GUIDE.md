# Real-Time GPS Bus Tracking System - Complete Guide

## Overview

This is a fully working real-time bus tracking system that uses **actual GPS data** from devices, not simulated data. The system consists of a driver app, backend processing, and real-time map visualization.

## System Architecture

```
Driver Device (GPS) → Backend API → WebSocket → Real-Time Map
     ↓                    ↓            ↓           ↓
  Browser GPS         GPS Service   Live Updates  Leaflet Map
  Every 3-5 sec      Process & ETA   Real-time    Vehicle Markers
```

## Components

### 1. Driver Side (`driver.html`)
**Purpose**: Collect real GPS data from driver's device
**Features**:
- Uses browser Geolocation API
- Sends GPS updates every 3-5 seconds
- High accuracy GPS tracking
- Real-time status indicators
- Vehicle and route selection

**Data Sent**:
```javascript
{
  vehicle_id: "BUS-001",
  route_id: "ROUTE_1", 
  driver_name: "Driver 1",
  latitude: 40.7484,
  longitude: -73.9857,
  speed: 12.5,
  accuracy: 8,
  timestamp: 1713456789000
}
```

### 2. Backend Processing
**GPS Controller** (`backend/src/api/controllers/gps.controller.js`):
- Receives GPS updates via POST `/api/gps/update`
- Validates coordinates and data
- Processes updates through GPS service

**GPS Service** (`backend/src/services/gps.service.js`):
- Calculates heading from previous position
- Finds next stop on route
- Calculates ETA using distance/speed
- Determines vehicle status (live/delayed/offline)
- Broadcasts updates via WebSocket

**Routes**:
- `POST /api/gps/update` - Receive GPS data
- `GET /api/gps/vehicles` - Get all active vehicles
- `GET /api/gps/vehicle/:id` - Get specific vehicle

### 3. Real-Time Map (`realtime-map.html`)
**Purpose**: Display live vehicle positions
**Features**:
- Leaflet map with real coordinates
- Live vehicle markers with heading
- Route polylines and stops
- Real-time sidebar with vehicle info
- WebSocket connection status
- ETA calculations

**Updates**:
- Vehicle positions update in real-time
- Status indicators (Live/Delayed/Offline)
- Speed, ETA, next stop info
- Connection status monitoring

## How It Works

### Step 1: Driver Starts Tracking
1. Driver opens `driver.html` on mobile device
2. Enters Vehicle ID, Route, and Name
3. Clicks "Start Tracking"
4. Browser requests GPS permission
5. GPS updates sent every 3-5 seconds to backend

### Step 2: Backend Processing
1. GPS data received at `/api/gps/update`
2. Data validated and processed
3. Heading calculated from previous position
4. Next stop found using route data
5. ETA calculated: `distance / speed`
6. Status determined by update frequency
7. Data broadcast via WebSocket

### Step 3: Real-Time Display
1. Map receives WebSocket updates
2. Vehicle marker updated with new position
3. Marker rotated to show heading
4. Sidebar updated with speed, ETA, status
5. Smooth movement animation

## Predefined Routes

The system includes 3 real NYC routes:

### Route 1 - Downtown Express
- **Path**: Times Square → Bryant Park → Grand Central → Central Park South → Columbus Circle → Lincoln Center
- **Stops**: 6 stops
- **Color**: Blue (#667eea)

### Route 2 - Airport Shuttle  
- **Path**: JFK Airport → Jamaica Station → Forest Hills → Long Island City → Midtown → Times Square
- **Stops**: 6 stops
- **Color**: Green (#28a745)

### Route 3 - Campus Loop
- **Path**: Columbia University → Central Park North → Central Park South → Bryant Park → Times Square → Upper West Side
- **Stops**: 6 stops  
- **Color**: Red (#dc3545)

## ETA System

**Calculation**: `ETA = distance_to_next_stop / current_speed`

**Factors**:
- Real-time GPS speed
- Actual distance to next stop
- Updated every GPS ping (3-5 seconds)

**Display**:
- `< 1 min` for under 1 minute
- `5 min` for 5+ minutes
- `N/A` if no speed or next stop

## Resilience Logic

**Status Determination**:
- **Live**: Last update < 10 seconds ago
- **Delayed**: Last update 10-30 seconds ago  
- **Offline**: Last update > 30 seconds ago

**Network Quality**:
- Based on GPS accuracy
- ≤5m accuracy = 100% quality
- ≤10m accuracy = 90% quality
- ≤20m accuracy = 80% quality
- >100m accuracy = 50% quality

## User Experience

### Driver App
- Clean, mobile-friendly interface
- Real-time GPS status indicators
- Update counter and statistics
- Error handling and retry logic
- Battery-efficient GPS tracking

### Real-Time Map
- Smooth vehicle movement
- Live status indicators
- Connection status monitoring
- Vehicle selection and details
- Responsive design (mobile/desktop)

## Setup Instructions

### 1. Start Backend
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3000`

### 2. Start Frontend
```bash
node serve.js
```
Frontend runs on `http://localhost:8080`

### 3. Open Driver App
Navigate to: `http://localhost:8080/driver.html`
- Select Vehicle ID (BUS-001, BUS-002, etc.)
- Select Route (Route 1, 2, or 3)
- Enter Driver Name
- Click "Start Tracking"
- Allow GPS permission

### 4. Open Real-Time Map
Navigate to: `http://localhost:8080/realtime-map.html`
- Map loads with routes and stops
- Vehicle markers appear when GPS data received
- Real-time updates via WebSocket

## Testing

### Test with Real Device
1. Open driver app on mobile phone
2. Go outside for better GPS signal
3. Start tracking
4. Watch vehicle move on map in real-time
5. Walk/drive to see position updates

### Test Multiple Vehicles
1. Open driver app on multiple devices
2. Use different Vehicle IDs (BUS-001, BUS-002)
3. Select different routes
4. All vehicles appear on same map

## API Endpoints

### GPS Data
```bash
# Send GPS update
POST /api/gps/update
Content-Type: application/json

{
  "vehicle_id": "BUS-001",
  "route_id": "ROUTE_1",
  "driver_name": "John Doe",
  "latitude": 40.7484,
  "longitude": -73.9857,
  "speed": 12.5,
  "accuracy": 8,
  "timestamp": 1713456789000
}

# Get all vehicles
GET /api/gps/vehicles

# Get specific vehicle
GET /api/gps/vehicle/BUS-001
```

### Routes
```bash
# Get all routes
GET /api/routes

# Get specific route
GET /api/routes/ROUTE_1
```

## WebSocket Events

### Vehicle Updates
```javascript
{
  "type": "vehicle_update",
  "vehicle": {
    "vehicle_id": "BUS-001",
    "route_id": "ROUTE_1",
    "latitude": 40.7484,
    "longitude": -73.9857,
    "speed": 12.5,
    "heading": 45,
    "status": "live",
    "next_stop_name": "Bryant Park",
    "eta_seconds": 180
  },
  "timestamp": 1713456789000
}
```

## Files Structure

```
├── driver.html              # Driver GPS collection app
├── realtime-map.html         # Real-time tracking map
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/
│   │   │   │   └── gps.controller.js    # GPS API endpoints
│   │   │   └── routes/
│   │   │       └── gps.routes.js        # GPS routes
│   │   ├── services/
│   │   │   └── gps.service.js           # GPS processing logic
│   │   ├── data/
│   │   │   └── routes.data.js           # Predefined routes
│   │   └── websocket/
│   │       └── ws.server.js             # WebSocket broadcasting
```

## Key Features

✅ **Real GPS Data**: Uses actual device GPS, not simulation  
✅ **Real-Time Updates**: 3-5 second update frequency  
✅ **Live Map**: Smooth vehicle movement with heading  
✅ **ETA Calculation**: Distance/speed based ETA  
✅ **Status Monitoring**: Live/Delayed/Offline detection  
✅ **Multiple Vehicles**: Support for multiple buses  
✅ **Mobile Friendly**: Responsive design  
✅ **Network Resilience**: Handles connection issues  
✅ **Route Visualization**: Polylines and stops  
✅ **WebSocket Updates**: Real-time data streaming  

## Troubleshooting

### GPS Not Working
- Enable location services in browser
- Go outside for better GPS signal
- Check browser permissions
- Use HTTPS for production (required for GPS)

### No Updates on Map
- Check WebSocket connection status
- Verify backend is running on port 3000
- Check browser console for errors
- Ensure driver app is sending data

### Poor GPS Accuracy
- Move to open area (away from buildings)
- Wait for GPS to stabilize (30-60 seconds)
- Check device GPS settings
- Use dedicated GPS device for better accuracy

## Production Deployment

### Requirements
- HTTPS (required for GPS API)
- WebSocket support
- PostgreSQL database
- Redis for caching
- Mobile-optimized

### Environment Variables
```bash
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NODE_ENV=production
```

## Summary

This is a **complete real-time GPS tracking system** that:
- Collects actual GPS data from driver devices
- Processes data in real-time with ETA calculations
- Displays live vehicle positions on interactive map
- Handles multiple vehicles simultaneously
- Provides resilient network handling
- Works on mobile and desktop devices

The system is production-ready and can be deployed for real bus tracking operations.

---

**Status**: ✅ Complete and Ready
**Last Updated**: April 18, 2026
**Real GPS**: Yes - Uses actual device location