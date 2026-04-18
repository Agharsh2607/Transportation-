/**
 * In-memory queue service for GPS packet processing.
 *
 * HACKATHON NOTE:
 * This implementation uses a simple JavaScript array as the queue.
 * It is intentionally lightweight for local development and demos.
 *
 * PRODUCTION REPLACEMENT — Redis Streams:
 * Replace this module with Redis Streams (XADD / XREADGROUP) for:
 *   - Durability: messages survive process restarts
 *   - Consumer groups: multiple workers can process in parallel
 *   - Acknowledgement: failed messages are retried automatically
 *   - Backpressure: producers can be slowed if consumers fall behind
 *
 * Example production API:
 *   enqueuePacket  → redisCache.xadd('gps:stream', '*', 'data', JSON.stringify(packet))
 *   startConsumer  → redisCache.xreadgroup('GROUP', 'workers', 'worker-1', 'COUNT', 100, 'BLOCK', 500, 'STREAMS', 'gps:stream', '>')
 *
 * BullMQ (backed by Redis) is also a strong alternative for job queues with
 * retry logic, priority, and delayed jobs built in.
 */

const logger = require('../utils/logger');

/** @type {Array<object>} */
let packetQueue = [];

let consumerInterval = null;

/**
 * Push a packet onto the in-memory queue.
 * @param {object} packet
 */
function enqueuePacket(packet) {
  packetQueue.push(packet);
}

/**
 * Drain and return all queued packets, clearing the queue.
 * @returns {Array<object>}
 */
function dequeueAll() {
  const packets = packetQueue.slice();
  packetQueue = [];
  return packets;
}

/**
 * Start a polling consumer that drains the queue every 500ms
 * and passes the batch to the provided processing function.
 * @param {function(Array<object>): Promise<void>} processFn
 */
function startConsumer(processFn) {
  if (consumerInterval) {
    logger.warn('Queue consumer already running');
    return;
  }

  consumerInterval = setInterval(async () => {
    const packets = dequeueAll();
    if (packets.length === 0) return;

    try {
      await processFn(packets);
    } catch (err) {
      logger.error('Queue consumer processFn error', { message: err.message, count: packets.length });
    }
  }, 500);

  logger.info('Queue consumer started (500ms polling interval)');
}

/**
 * Stop the consumer interval (used during graceful shutdown).
 */
function stopConsumer() {
  if (consumerInterval) {
    clearInterval(consumerInterval);
    consumerInterval = null;
    logger.info('Queue consumer stopped');
  }
}

module.exports = { enqueuePacket, dequeueAll, startConsumer, stopConsumer };
