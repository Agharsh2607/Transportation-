const { Router } = require('express');
const etaController = require('../controllers/eta.controller');

const router = Router();

/**
 * GET /eta/:vehicleId
 * Returns ETA predictions for all upcoming stops on the vehicle's current route.
 */
router.get('/eta/:vehicleId', etaController.getETA);

module.exports = router;
