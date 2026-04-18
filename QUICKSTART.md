# Quick Start - Live Transport Tracking

## 🚀 Get Started in 30 Seconds

### 1. Open the Live Map
```
http://localhost:8080/live-map.html
```

### 2. Click "Start Tracking"
This starts GPS simulation for 3 buses on 3 different routes.

### 3. Watch Buses Move
- Buses appear on the map
- They move along their routes in real-time
- Speed and ETA update every 2 seconds
- Click a bus to center the map on it

## 📍 What You'll See

**Map**
- 3 colored route polylines
- White stop markers at each station
- Blue bus icons with heading arrows
- Real-time position updates

**Sidebar**
- List of all tracking vehicles
- Live speed (m/s)
- ETA to next stop
- Next stop name
- Network quality %

## 🎮 Controls

| Button | Action |
|--------|--------|
| **Start Tracking** | Begin GPS simulation |
| **Stop** | Stop all simulations |
| **+** | Zoom in |
| **−** | Zoom out |
| **⊙** | Center map on all vehicles |

## 📊 Live Data

Each vehicle sends GPS updates every 2 seconds:
- Position (latitude, longitude)
- Speed (m/s)
- Heading (degrees)
- Network quality (%)
- Timestamp

## 🛣️ Routes

### Route 1: Downtown Express
- Times Square → Harlem Terminal
- 6 stops, ~15 km
- Bus: BUS-001

### Route 2: Crosstown Shuttle
- Battery Park → Union Square
- 5 stops, ~8 km
- Bus: BUS-002

### Route 3: Airport Link
- Downtown → Airport
- 4 stops, ~12 km
- Bus: BUS-003

## 🔧 How It Works

1. **GPS Simulator** generates realistic GPS packets
2. **Backend** processes packets and calculates ETAs
3. **WebSocket** broadcasts updates to frontend
4. **Map** updates vehicle positions in real-time
5. **Sidebar** shows live vehicle info

## 📱 Real-World Integration

To use with real GPS data:

1. Replace GPS simulator with your driver app API
2. Send GPS packets to `/api/ingest` endpoint
3. Update route data with your actual routes
4. Deploy backend to production

## 🐛 Troubleshooting

**Buses not showing?**
- Refresh the page
- Click "Start Tracking" again
- Check browser console (F12)

**Map not loading?**
- Verify internet connection (needs OpenStreetMap tiles)
- Try a different browser
- Clear browser cache

**WebSocket errors?**
- Ensure backend is running on port 3000
- Check firewall settings
- Restart the backend

## 📚 Learn More

See `LIVE_TRACKING_GUIDE.md` for detailed documentation.

## 🎯 Key Features

✓ Real-time GPS tracking  
✓ Live ETA predictions  
✓ Interactive Leaflet map  
✓ WebSocket updates  
✓ Network resilience  
✓ Responsive design  
✓ No database required (works in-memory)  

---

**Ready?** Open http://localhost:8080/live-map.html and click "Start Tracking"!
