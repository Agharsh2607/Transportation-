const cacheService = require('./cache.service');
const queueService = require('./queue.service');
const { parsePacket } = require('../utils/packet.utils');
const logger = require('../utils/logger');

/**
 * Process an array of incoming GPS packets.
 *
 * For each packet:
 * 1. Check for duplicate sequence number via Redis
 * 2. Skip duplicates
 * 3. Parse and normalize the packet
 * 4. Enqueue for async processing
 * 5. Update the offline buffer count in Redis
 *
 * @param {Array<object>} packets - Raw packet objects (already parsed by batchToPackets)
 * @returns {Promise<{ accepted: number, skipped: number }>}
 */
async function processIngest(packets) {
  let accepted = 0;
  let skipped = 0;

  for (const rawPacket of packets) {
    try {
      const packet = parsePacket(rawPacket);

      if (!packet.vehicle_id) {
        logger.warn('Ingest: packet missing vehicle_id, skipping');
        skipped++;
        continue;
      }

      // Check for duplicate sequence number
      const isDup = await cacheService.isDuplicateSeq(packet.vehicle_id, packet.seq);
      if (isDup) {
        logger.debug('Ingest: duplicate seq skipped', { vehicle_id: packet.vehicle_id, seq: packet.seq });
        skipped++;
        continue;
      }

      // Enqueue for async processing by the queue consumer
      queueService.enqueuePacket(packet);

      // Track buffer count (useful for offline reconnect scenarios)
      const currentCount = await cacheService.getBufferCount(packet.vehicle_id);
      await cacheService.setBufferCount(packet.vehicle_id, currentCount + 1);

      accepted++;
    } catch (err) {
      logger.error('ingest.service.processIngest packet error', { message: err.message });
      skipped++;
    }
  }

  logger.info('Ingest batch processed', { accepted, skipped, total: packets.length });
  return { accepted, skipped };
}

module.exports = { processIngest };
