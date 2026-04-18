const ingestService = require('../../services/ingest.service');
const { batchToPackets } = require('../../utils/packet.utils');
const { isoNow } = require('../../utils/time.utils');
const logger = require('../../utils/logger');

/**
 * POST /api/ingest
 * Accepts a single GPS packet or a batch of packets from a vehicle.
 * Returns 202 Accepted with counts of accepted and skipped packets.
 */
async function receive(req, res, next) {
  try {
    const packets = batchToPackets(req.body);

    if (packets.length === 0) {
      return res.status(400).json({ error: 'No valid packets in request body', code: 400 });
    }

    const { accepted, skipped } = await ingestService.processIngest(packets);

    return res.status(202).json({
      accepted,
      skipped,
      timestamp: isoNow(),
    });
  } catch (err) {
    logger.error('ingest.controller.receive error', { message: err.message });
    next(err);
  }
}

module.exports = { receive };
