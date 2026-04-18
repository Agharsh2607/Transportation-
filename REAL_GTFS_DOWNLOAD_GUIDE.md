# Real GTFS Data Download Guide

## Overview

This guide explains how to download real GTFS data from Indian cities and use it with the system.

## Supported Cities

### 1. Delhi (DTC - Delhi Transport Corporation)

**Data Source**: https://data.gov.in/resource/delhi-bus-routes-and-stops

**Steps**:
1. Visit https://data.gov.in
2. Search for "Delhi Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 600+
- Stops: 5000+
- File size: ~50 MB

**Coverage**: Entire Delhi NCR region

---

### 2. Bangalore (BMTC - Bangalore Metropolitan Transport Corporation)

**Data Source**: https://data.gov.in/resource/bangalore-bus-routes

**Steps**:
1. Visit https://data.gov.in
2. Search for "Bangalore Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 400+
- Stops: 3000+
- File size: ~30 MB

**Coverage**: Bangalore city and suburbs

---

### 3. Mumbai (BEST - Brihanmumbai Electric Supply and Transport)

**Data Source**: https://data.gov.in/resource/mumbai-bus-routes

**Steps**:
1. Visit https://data.gov.in
2. Search for "Mumbai Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 350+
- Stops: 3000+
- File size: ~25 MB

**Coverage**: Mumbai city and suburbs

---

### 4. Kolkata (WBTC - West Bengal Transport Corporation)

**Data Source**: https://data.gov.in/resource/kolkata-bus-routes

**Steps**:
1. Visit https://data.gov.in
2. Search for "Kolkata Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 200+
- Stops: 1500+
- File size: ~15 MB

**Coverage**: Kolkata city

---

### 5. Pune (PMPML - Pune Mahanagar Parivahan Mahal Limited)

**Data Source**: https://data.gov.in/resource/pune-bus-routes

**Steps**:
1. Visit https://data.gov.in
2. Search for "Pune Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 150+
- Stops: 1000+
- File size: ~10 MB

**Coverage**: Pune city

---

### 6. Hyderabad (TSRTC - Telangana State Road Transport Corporation)

**Data Source**: https://data.gov.in/resource/hyderabad-bus-routes

**Steps**:
1. Visit https://data.gov.in
2. Search for "Hyderabad Bus Routes"
3. Download the GTFS ZIP file
4. Extract to `backend/data/gtfs`

**Data Size**:
- Routes: 300+
- Stops: 2000+
- File size: ~20 MB

**Coverage**: Hyderabad city

---

## Installation Steps

### Step 1: Create Data Directory

```bash
mkdir -p backend/data/gtfs
```

### Step 2: Download GTFS

Visit https://data.gov.in and search for your city:

```
Search: "[City Name] Bus Routes"
Download: GTFS ZIP file
```

### Step 3: Extract GTFS

```bash
# Extract to backend/data/gtfs
unzip [city]-gtfs.zip -d backend/data/gtfs
```

### Step 4: Verify Files

Check that you have these files:

```bash
ls backend/data/gtfs/
# Should show:
# - routes.txt
# - stops.txt
# - stop_times.txt
# - trips.txt
# - calendar.txt (optional)
# - agency.txt (optional)
```

### Step 5: Restart Backend

```bash
cd backend
npm start
```

The system will automatically:
1. Parse GTFS files
2. Load into database
3. Start vehicle simulation
4. Begin sending GPS updates

### Step 6: Open Live Map

```
http://localhost:8080/live-map.html
```

You should see:
- All routes from the GTFS data
- All stops on the map
- Buses moving in real-time

---

## GTFS File Format

### routes.txt

Required columns:
```
route_id,agency_id,route_short_name,route_long_name,route_type
DL1,DTC,1,Delhi Route 1,3
```

### stops.txt

Required columns:
```
stop_id,stop_code,stop_name,stop_lat,stop_lon
S1,1001,Connaught Place,28.6328,77.1896
```

### trips.txt

Required columns:
```
route_id,service_id,trip_id,trip_headsign,direction_id
DL1,WD,T1,Connaught Place,0
```

### stop_times.txt

Required columns:
```
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,06:00:00,06:00:00,S1,1
```

---

## Troubleshooting

### Files Not Found

**Error**:
```
Error: GTFS path does not exist: ./data/gtfs
```

**Solution**:
```bash
mkdir -p backend/data/gtfs
# Download and extract GTFS files
```

### Invalid CSV Format

**Error**:
```
Error: routes.txt not found at ./data/gtfs/routes.txt
```

**Solution**:
- Verify GTFS ZIP was extracted correctly
- Check file names are lowercase
- Ensure CSV files are not corrupted

### Missing Columns

**Error**:
```
Error: Cannot read property 'route_id' of undefined
```

**Solution**:
- Verify GTFS files have required columns
- Check CSV headers are correct
- Use standard GTFS format

### Database Error

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
- Start PostgreSQL
- Or system will use in-memory storage (degraded mode)

### No Vehicles Appearing

**Error**:
```
Warning: GTFS load failed, using predefined routes
```

**Solution**:
- Check GTFS files are valid
- Verify routes.txt has route_id column
- Verify stops.txt has stop_id column
- Check stop_times.txt has trip_id and stop_id

---

## Performance Tips

### For Large GTFS (600+ routes)

1. **Increase Node.js memory**:
   ```bash
   node --max-old-space-size=2048 src/server.js
   ```

2. **Increase database connections**:
   ```bash
   # In backend/src/config/db.config.js
   max: 20  // Increase from default
   ```

3. **Use SSD for database**:
   - Faster GTFS loading
   - Better query performance

### For Multiple Cities

1. **Create separate data directories**:
   ```bash
   backend/data/gtfs-delhi/
   backend/data/gtfs-bangalore/
   backend/data/gtfs-mumbai/
   ```

2. **Load via API**:
   ```bash
   curl -X POST http://localhost:3000/api/gtfs/load \
     -H "Content-Type: application/json" \
     -d '{"gtfsPath":"./data/gtfs-delhi"}'
   ```

3. **Add city selector to frontend**:
   ```javascript
   // live-map.html
   const cities = {
     'delhi': './data/gtfs-delhi',
     'bangalore': './data/gtfs-bangalore',
     'mumbai': './data/gtfs-mumbai',
   };
   ```

---

## Testing

### Verify GTFS Loaded

```bash
# Check routes
curl http://localhost:3000/api/gtfs/routes | jq 'length'

# Check stops
curl http://localhost:3000/api/gtfs/stops | jq 'length'

# Check specific route
curl http://localhost:3000/api/gtfs/routes/DL1 | jq '.'
```

### Monitor Vehicle Simulation

```bash
# Get live vehicles
curl http://localhost:3000/api/vehicles | jq '.'

# Watch WebSocket updates
# Open browser console on live-map.html
# Check for vehicle position updates
```

### Check Logs

```bash
# Backend logs show GTFS loading progress
npm start

# Look for:
# "GTFS loaded successfully"
# "India bus simulator started"
# "Inserted routes: 600"
# "Inserted stops: 5000"
```

---

## Data Quality

### Expected Data

- **Routes**: 150-600 per city
- **Stops**: 1000-5000 per city
- **Trips**: 5000-50000 per city
- **Stop times**: 50000-500000 per city

### Common Issues

1. **Missing stops**: Some routes may have incomplete stop data
2. **Duplicate stops**: Same stop with different IDs
3. **Invalid coordinates**: Out-of-range lat/lng values
4. **Missing times**: Some trips may lack stop times

**System handles these gracefully**:
- Skips invalid records
- Continues loading
- Logs warnings
- Uses available data

---

## Real-time Updates

### Vehicle Simulation

Once GTFS is loaded:
1. System creates 2-3 buses per route
2. Buses move along route polylines
3. GPS updates sent every 2 seconds
4. Frontend receives updates via WebSocket
5. Map updates in real-time

### Update Frequency

- **GPS packets**: Every 2 seconds
- **WebSocket updates**: Real-time
- **Map refresh**: Immediate
- **Database queries**: Cached

---

## Next Steps

1. ✅ Download GTFS from data.gov.in
2. ✅ Extract to `backend/data/gtfs`
3. ✅ Restart backend (`npm start`)
4. ✅ Open live map (`http://localhost:8080/live-map.html`)
5. ✅ Watch buses move in real-time
6. ⏳ Add city selector to frontend
7. ⏳ Deploy to production

---

## Support

### Resources

- **GTFS Specification**: https://developers.google.com/transit/gtfs
- **data.gov.in**: https://data.gov.in
- **System Documentation**: See GTFS_INTEGRATION_GUIDE.md

### Common Questions

**Q: Can I use GTFS from other countries?**
A: Yes, any valid GTFS feed works. System is not India-specific.

**Q: How often is GTFS data updated?**
A: Depends on the agency. Usually monthly or quarterly.

**Q: Can I load multiple cities?**
A: Yes, use separate data directories and load via API.

**Q: What if GTFS data is incomplete?**
A: System skips invalid records and continues loading.

**Q: How do I update GTFS data?**
A: Download new GTFS, extract to `backend/data/gtfs`, restart backend.

---

**Last Updated**: April 18, 2026
**Status**: Ready for Production
