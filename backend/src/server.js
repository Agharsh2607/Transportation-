require('dotenv').config();

const http = require('http');
const app = require('./app');
const { createWSServer } = require('./websocket/ws.server');
const logger = require('./utils/logger');
const queueService = require('./services/queue.service');
const positionService = require('./services/position.service');
const { redisCache, redisPubSub } = require('./config/redis.config');
const { pool } = require('./config/db.config');
const { PORT } = require('./config/env');

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach WebSocket server to the same HTTP server
const wss = createWSServer(server);

// Start the queue consumer — processes GPS packets every 500ms
queueService.startConsumer(async (packets) => {
  for (const packet of packets) {
    await positionService.processPacket(packet);
  }
});

// Start listening
server.listen(PORT, () => {
  logger.info(`Transit backend listening on port ${PORT}`);
  logger.info(`WebSocket server ready on ws://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Stop queue consumer
    queueService.stopConsumer();

    // Close WebSocket server
    wss.close(() => {
      logger.info('WebSocket server closed');
    });

    // Close Redis connections
    try {
      await redisCache.quit();
      await redisPubSub.quit();
      logger.info('Redis connections closed');
    } catch (err) {
      logger.error('Error closing Redis', { message: err.message });
    }

    // Close PostgreSQL pool
    try {
      await pool.end();
      logger.info('PostgreSQL pool closed');
    } catch (err) {
      logger.error('Error closing PostgreSQL pool', { message: err.message });
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
