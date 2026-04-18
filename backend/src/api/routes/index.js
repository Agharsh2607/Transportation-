const { Router } = require('express');
const ingestRoutes = require('./ingest.routes');
const vehicleRoutes = require('./vehicle.routes');
const routeRoutes = require('./route.routes');
const stopRoutes = require('./stop.routes');
const etaRoutes = require('./eta.routes');
const transitRoutes = require('./transit.routes');
const gtfsRoutes = require('./gtfs.routes');
const gpsRoutes = require('./gps.routes');
const liveTrackingRoutes = require('./liveTracking.routes');
const adminRoutes = require('./admin.routes');
const fleetRoutes = require('./fleet.routes');

const router = Router();

// Mount all sub-routers — they will be prefixed with /api in app.js
router.use(ingestRoutes);
router.use(vehicleRoutes);
router.use(routeRoutes);
router.use(stopRoutes);
router.use(etaRoutes);
router.use(transitRoutes);
router.use('/gtfs', gtfsRoutes);
router.use('/gps', gpsRoutes);
router.use('/live', liveTrackingRoutes);
router.use('/admin', adminRoutes);
router.use('/fleet', fleetRoutes);

module.exports = router;
