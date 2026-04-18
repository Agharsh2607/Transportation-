const { Router } = require('express');
const { ingestRateLimit } = require('../../middleware/rateLimit.middleware');
const { vehicleAuth } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { batchIngestSchema } = require('../validators/ingest.validator');
const ingestController = require('../controllers/ingest.controller');

const router = Router();

/**
 * POST /ingest
 * Accepts GPS packets from vehicles.
 * Protected by vehicle secret auth and rate limiting.
 */
router.post(
  '/ingest',
  ingestRateLimit,
  vehicleAuth,
  validate(batchIngestSchema),
  ingestController.receive
);

module.exports = router;
