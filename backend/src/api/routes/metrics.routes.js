const { Router } = require('express');
const metricsController = require('../controllers/metrics.controller');

const router = Router();

/**
 * GET /api/system/metrics
 * Returns aggregated system metrics including vehicle counts by status,
 * total count, and server uptime.
 */
router.get(
  '/metrics',
  (req, res) => metricsController.getMetrics(req, res)
);

module.exports = router;
