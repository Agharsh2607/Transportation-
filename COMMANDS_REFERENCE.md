# Commands Reference - Real-Time Transport Tracking

## System Control

### Start Backend Server
```bash
cd backend
npm start
```

### Start Frontend Server
```bash
node serve.js
```

### Stop Servers
```bash
# Kill Node processes
pkill node
```

---

## API Testing

### Search Locations
```bash
curl "http://localhost:3000/api/transit/search?q=Times%20Square"
```

### Get Routes Between Locations
```bash
curl "http://localhost:3000/api/transit/routes?fromLat=40.7484&fromLng=-73.9857&toLat=40.7128&toLng=-74.0060"
```

### Get Vehicle Positions
```bash
curl "http://localhost:3000/api/transit/vehicles?routeId=route_001"
```

### Get Transit Agencies
```bash
curl "http://localhost:3000/api/transit/agencies?lat=40.7484&lng=-73.9857"
```

### Get Route Stops
```bash
curl "http://localhost:3000/api/transit/stops?routeId=route_001"
```

### Start GPS Simulation
```bash
curl -X POST http://localhost:3000/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001","routeId":"route_001"}'
```

### Stop GPS Simulation
```bash
curl -X POST http://localhost:3000/api/simulation/stop \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001"}'
```

### Get Simulation Status
```bash
curl http://localhost:3000/api/simulation/status
```

### Get All Routes
```bash
curl http://localhost:3000/api/simulation/routes
```

### Get Live Vehicles
```bash
curl http://localhost:3000/api/simulation/vehicles
```

### Health Check
```bash
curl http://localhost:3000/health
```

---

## Browser URLs

### Live Map
```
http://localhost:8080/live-map.html
```

### Landing Page
```
http://localhost:8080/index.html
```

### Login Page
```
http://localhost:8080/auth.html
```

### Dashboard
```
http://localhost:8080/dashboard.html
```

### Vehicle Detail
```
http://localhost:8080/vehicle-detail.html
```

### Admin Panel
```
http://localhost:8080/admin.html
```

---

## Git Commands

### View Commit History
```bash
git log --oneline -20
```

### View Commit Dates
```bash
git log --format='%h | %ai | %s'
```

### Check Git Status
```bash
git status
```

### View Recent Changes
```bash
git diff HEAD~5
```

---

## Development Commands

### Install Dependencies
```bash
cd backend
npm install
```

### Check Node Version
```bash
node --version
npm --version
```

### List Running Processes
```bash
# Windows
Get-Process node

# Linux/Mac
ps aux | grep node
```

### Kill Node Process
```bash
# Windows
Stop-Process -Name node -Force

# Linux/Mac
pkill -f node
```

---

## Database Commands (Optional)

### Connect to PostgreSQL
```bash
psql -U postgres -d transit_db
```

### View Tables
```sql
\dt
```

### View Location Pings
```sql
SELECT * FROM location_pings LIMIT 10;
```

### View Vehicles
```sql
SELECT * FROM vehicles;
```

### View Routes
```sql
SELECT * FROM routes;
```

### View Stops
```sql
SELECT * FROM stops;
```

---

## Redis Commands (Optional)

### Connect to Redis
```bash
redis-cli
```

### Get Vehicle State
```bash
GET vehicle:BUS-001:state
```

### Get Active Vehicles
```bash
ZRANGE vehicles:active 0 -1
```

### Clear Cache
```bash
FLUSHDB
```

### Monitor Redis
```bash
MONITOR
```

---

## Docker Commands (Optional)

### Start Docker Compose
```bash
cd backend
docker-compose up -d
```

### Stop Docker Compose
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Rebuild Images
```bash
docker-compose build --no-cache
```

---

## Testing Commands

### Test Backend Health
```bash
curl http://localhost:3000/health
```

### Test Frontend
```bash
curl http://localhost:8080/live-map.html
```

### Test WebSocket
```bash
# Using wscat (npm install -g wscat)
wscat -c ws://localhost:3000
```

### Test API Response Time
```bash
time curl http://localhost:3000/api/simulation/routes
```

---

## Monitoring Commands

### Monitor Backend Logs
```bash
# Windows
Get-Content backend.log -Tail 50 -Wait

# Linux/Mac
tail -f backend.log
```

### Monitor Network Traffic
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### Check Memory Usage
```bash
# Windows
Get-Process node | Select-Object ProcessName, WorkingSet

# Linux/Mac
ps aux | grep node
```

---

## Deployment Commands

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
NODE_ENV=production npm start
```

### Set Environment Variables
```bash
# Windows
$env:PORT=3000
$env:NODE_ENV=production

# Linux/Mac
export PORT=3000
export NODE_ENV=production
```

---

## Debugging Commands

### Enable Debug Logging
```bash
DEBUG=* npm start
```

### Check Port Usage
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### View Process Details
```bash
# Windows
Get-Process node | Format-List

# Linux/Mac
ps aux | grep node
```

---

## File Management

### View Project Structure
```bash
# Windows
tree /F

# Linux/Mac
tree -L 3
```

### Count Files
```bash
# Windows
(Get-ChildItem -Recurse).Count

# Linux/Mac
find . -type f | wc -l
```

### Find Large Files
```bash
# Windows
Get-ChildItem -Recurse | Sort-Object Length -Descending | Select-Object -First 10

# Linux/Mac
find . -type f -exec ls -lh {} \; | sort -k5 -hr | head -10
```

---

## Quick Start Commands

### One-Line Setup
```bash
# Start backend
cd backend && npm install && npm start &

# Start frontend (in new terminal)
node serve.js &

# Open browser
start http://localhost:8080/live-map.html
```

### One-Line Cleanup
```bash
# Kill all Node processes
pkill node
```

---

## Useful Aliases

### Create Aliases (Linux/Mac)
```bash
alias start-backend='cd backend && npm start'
alias start-frontend='node serve.js'
alias stop-servers='pkill node'
alias test-api='curl http://localhost:3000/health'
alias open-map='open http://localhost:8080/live-map.html'
```

### Use Aliases
```bash
start-backend
start-frontend
stop-servers
test-api
open-map
```

---

## Common Issues & Fixes

### Port Already in Use
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Kill process
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

### Module Not Found
```bash
cd backend
npm install
```

### WebSocket Connection Failed
```bash
# Check backend is running
curl http://localhost:3000/health

# Check firewall
# Windows: Check Windows Defender Firewall
# Linux/Mac: Check iptables
```

### API Returns 404
```bash
# Check route is registered
curl http://localhost:3000/api/simulation/routes

# Check backend logs
# Look for route registration messages
```

---

## Performance Testing

### Load Test
```bash
# Using Apache Bench (ab)
ab -n 1000 -c 10 http://localhost:3000/api/simulation/routes
```

### Stress Test
```bash
# Using wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/simulation/routes
```

### Monitor Performance
```bash
# Windows
Get-Process node | Select-Object ProcessName, CPU, WorkingSet

# Linux/Mac
top -p $(pgrep -f "node")
```

---

## Backup & Restore

### Backup Database
```bash
# PostgreSQL
pg_dump -U postgres transit_db > backup.sql
```

### Restore Database
```bash
# PostgreSQL
psql -U postgres transit_db < backup.sql
```

### Backup Redis
```bash
redis-cli BGSAVE
```

---

## Documentation

### View README
```bash
cat README.md
```

### View Architecture
```bash
cat ARCHITECTURE.md
```

### View API Reference
```bash
cat API_REFERENCE.md
```

### View Quick Start
```bash
cat QUICKSTART.md
```

---

## Summary

**Essential Commands**:
```bash
# Start system
cd backend && npm start &
node serve.js &

# Test API
curl http://localhost:3000/api/simulation/routes

# Open browser
http://localhost:8080/live-map.html

# Stop system
pkill node
```

---

**Last Updated**: April 18, 2026
