const WebSocket = require('ws');
const { handleConnection } = require('./ws.handler');
const { startHeartbeat } = require('./ws.heartbeat');
const { broadcast } = require('./ws.broadcaster');
const { redisPubSub } = require('../config/redis.config');
const logger = require('../utils/logger');

/**
 * Create and configure the WebSocket server.
 *
 * - Attaches to the existing HTTP server (no separate port needed)
 * - Handles new connections via ws.handler
 * - Starts the heartbeat to detect dead connections
 * - Subscribes to the Redis 'live_updates' channel and broadcasts
 *   incoming messages to the appropriate route room
 *
 * @param {import('http').Server} httpServer
 * @returns {import('ws').Server}
 */
function createWSServer(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  wss.on('error', (err) => {
    logger.error('WebSocket server error', { message: err.message });
  });

  // Start heartbeat to prune dead connections
  const heartbeatInterval = startHeartbeat(wss);

  // Subscribe to Redis live_updates channel
  redisPubSub.subscribe('live_updates', (err) => {
    if (err) {
      logger.error('Failed to subscribe to Redis live_updates', { message: err.message });
    } else {
      logger.info('Subscribed to Redis channel: live_updates');
    }
  });

  // Also subscribe to alert channels (wildcard via psubscribe)
  redisPubSub.psubscribe('alerts:*', (err) => {
    if (err) {
      logger.error('Failed to psubscribe to Redis alerts:*', { message: err.message });
    } else {
      logger.info('Subscribed to Redis pattern: alerts:*');
    }
  });

  // Relay live position updates to WebSocket rooms
  redisPubSub.on('message', (channel, message) => {
    if (channel === 'live_updates') {
      try {
        const data = JSON.parse(message);
        // Broadcast to route-specific room
        if (data.route_id) {
          broadcast(data.route_id, { type: 'vehicle_update', vehicle: data });
        }
        // Also broadcast to all connected clients
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify({ type: 'vehicle_update', vehicle: data }));
            } catch (err) {
              logger.warn('Failed to send vehicle update to client', { message: err.message });
            }
          }
        }
      } catch (err) {
        logger.error('WS: failed to parse live_updates message', { message: err.message });
      }
    }
  });

  // Relay alert messages to WebSocket rooms
  redisPubSub.on('pmessage', (pattern, channel, message) => {
    // channel format: alerts:{routeId}
    const routeId = channel.replace('alerts:', '');
    try {
      const data = JSON.parse(message);
      broadcast(routeId, { type: 'alert', data });
    } catch (err) {
      logger.error('WS: failed to parse alert message', { channel, message: err.message });
    }
  });

  // Clean up heartbeat on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    logger.info('WebSocket server closed');
  });

  logger.info('WebSocket server created');
  return wss;
}

module.exports = { createWSServer };
