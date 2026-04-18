const { Router } = require('express');
const ingestRoutes = require('./ingest.routes');
const vehicleRoutes = require('./vehicle.routes');
const routeRoutes = require('./route.routes');
const stopRoutes = require('./stop.routes');
const etaRoutes = require('./eta.routes');

const router = Router();

// Mount all sub-routers — they will be prefixed with /api in app.js
router.use(ingestRoutes);
router.use(vehicleRoutes);
router.use(routeRoutes);
router.use(stopRoutes);
router.use(etaRoutes);

module.exports = router;
