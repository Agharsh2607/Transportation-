# GTFS Integration Quick Start

## What's New

The system now supports loading real GTFS (General Transit Feed Specification) data from Indian cities. Sample GTFS data for Delhi has been included for testing.

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs `csv-parser` required for GTFS parsing.

### 2. Start the Backend

```bash
npm start
```

You should see:
```
Transit backend listening on port 3000
GTFS loaded successfully
India bus simulator started with GTFS routes
```

### 3. Open Live Map

Open in browser:
```
http://localhost:8080/live-map.html
```

You should see:
- 3 Delhi routes (DL1, DL2, DL3)
- 15 stops across Delhi
- 6-9 buses moving in real-time
- Live updates every 2 seconds

### 4. Test API Endpoints

Get all routes:
```bash
curl http://localhost:3000/api/gtfs/routes
```

Get all stops:
```bash
curl http://localhost:3000/api/gtfs/stops
```

Get specific route:
```bash
curl http://localhost:3000/api/gtfs/routes/DL1
```

## Sample Data Included

The system includes sample GTFS data for testing:

**Routes** (3):
- DL1: Connaught Place → Gurgaon
- DL2: Chandni Chowk → Dwarka
- DL3: Noida City Center → Karol Bagh

**Stops** (15):
- Connaught Place, New Delhi Railway Station, Delhi Gate
- Kasturba Nagar, Lajpat Nagar, Safdarjung
- Rajiv Chowk, Chandni Chowk, Red Fort
- Jama Masjid, Karol Bagh, Patel Nagar
- Dwarka, Noida City Center, Gurgaon

**Vehicles** (6-9):
- 2-3 buses per route
- Moving every 2 seconds
- Realistic speeds (12-20 m/s)
- Heading and next stop info

## Using Real GTFS Data

To use real GTFS data from other Indian cities:

### 1. Download GTFS

Visit https://data.gov.in and search for your city:
- Delhi: DTC GTFS
- Bangalore: BMTC GTFS
- Mumbai: BEST GTFS
- Kolkata, Pune, Hyderabad: Available on data.gov.in

### 2. Extract to Data Directory

```bash
# Create directory
mkdir -p backend/data/gtfs

# Extract GTFS ZIP to backend/data/gtfs
# You should have:
# - routes.txt
# - stops.txt
# - stop_times.txt
# - trips.txt
```

### 3. Restart Backend

```bash
npm start
```

The system will automatically load the new GTFS data.

## Architecture

```
GTFS Files (CSV)
    ↓
Parser (gtfs.parser.js)
    ↓
Database (PostgreSQL)
    ↓
Route Service
    ↓
India Bus Simulator
    ↓
GPS Packets (every 2 seconds)
    ↓
WebSocket → Live Map
```

## Features

✅ **GTFS Loading**
- Parse routes.txt, stops.txt, trips.txt, stop_times.txt
- Build route polylines from stop sequences
- Store in PostgreSQL

✅ **Real-time Simulation**
- 2-3 buses per route
- GPS updates every 2 seconds
- Realistic speeds and headings
- Next stop calculation

✅ **API Endpoints**
- Load GTFS: `POST /api/gtfs/load`
- Get routes: `GET /api/gtfs/routes`
- Get stops: `GET /api/gtfs/stops`
- Get route: `GET /api/gtfs/routes/:routeId`

✅ **Resilience**
- Falls back to predefined routes if GTFS fails
- Handles missing files gracefully
- Continues on parser errors

## Troubleshooting

### No buses appearing
**Check**: Are GTFS files in `backend/data/gtfs`?
**Fix**: Copy GTFS files or use sample data

### "GTFS load failed" warning
**Check**: Are CSV files valid?
**Fix**: Verify routes.txt, stops.txt, trips.txt, stop_times.txt exist

### Database connection error
**Check**: Is PostgreSQL running?
**Fix**: System degrades gracefully, uses in-memory storage

### Buses not moving
**Check**: Is WebSocket connected?
**Fix**: Check browser console for errors

## Next Steps

1. ✅ Test with sample data (included)
2. Download real GTFS from data.gov.in
3. Extract to `backend/data/gtfs`
4. Restart backend
5. Watch real buses move on the map

## Files

**Created**:
- `backend/src/services/gtfs.parser.js` - GTFS CSV parser
- `backend/src/services/gtfs.loader.js` - Database loader
- `backend/src/services/india.bus.simulator.js` - Vehicle simulator
- `backend/src/api/controllers/gtfs.controller.js` - API controller
- `backend/src/api/routes/gtfs.routes.js` - API routes
- `backend/data/gtfs/routes.txt` - Sample routes
- `backend/data/gtfs/stops.txt` - Sample stops
- `backend/data/gtfs/trips.txt` - Sample trips
- `backend/data/gtfs/stop_times.txt` - Sample stop times

**Modified**:
- `backend/src/models/route.model.js` - Added insert()
- `backend/src/models/stop.model.js` - Added insert()
- `backend/src/api/routes/index.js` - Added GTFS routes
- `backend/src/server.js` - Added GTFS initialization
- `backend/package.json` - Added csv-parser

## Status

✅ **Ready to Use**
- Sample GTFS data included
- All services implemented
- API endpoints ready
- Server integration complete

---

**Last Updated**: April 18, 2026
**Status**: Ready for Testing
