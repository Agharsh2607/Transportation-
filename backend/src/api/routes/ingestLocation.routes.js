const { Router } = require('express');
const ingestLocationController = require('../controllers/ingestLocation.controller');

const router = Router();

/**
 * POST /api/ingest/location
 * Ingest a single GPS location ping.
 * Validates coordinates, rejects impossible jumps, upserts latest state,
 * inserts history, runs route matching + ETA, publishes update.
 */
router.post(
  '/ingest/location',
  (req, res) => ingestLocationController.ingestSingle(req, res)
);

/**
 * POST /api/ingest/location/batch
 * Ingest a batch of GPS pings (offline sync).
 * Sorts by timestamp, preserves chronological order,
 * does not override latest with older data.
 */
router.post(
  '/ingest/location/batch',
  (req, res) => ingestLocationController.ingestBatch(req, res)
);

module.exports = router;
