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
 * - Subscribes to Redis channels and broadcasts with minimal payloads:
 *   - 'vehicle:update' — individual vehicle position updates
 *   - 'vehicle:status' — status transition events
 *   - 'live_updates' — legacy channel (backward compatibility)
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

  // Subscribe to all channels
  const channels = ['vehicle:update', 'vehicle:status', 'live_updates'];
  channels.forEach(channel => {
    redisPubSub.subscribe(channel, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to Redis ${channel}`, { message: err.message });
      } else {
        logger.info(`Subscribed to Redis channel: ${channel}`);
      }
    });
  });

  // Also subscribe to alert channels (wildcard via psubscribe)
  redisPubSub.psubscribe('alerts:*', (err) => {
    if (err) {
      logger.error('Failed to psubscribe to Redis alerts:*', { message: err.message });
    } else {
      logger.info('Subscribed to Redis pattern: alerts:*');
    }
  });

  // Handle messages from all channels
  redisPubSub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'vehicle:update' || channel === 'live_updates') {
        // Minimal vehicle update payload — broadcast to all clients
        const payload = JSON.stringify({
          type: 'vehicle_update',
          vehicle: {
            vehicle_id: data.vehicle_id,
            bus_number: data.bus_number,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            heading: data.heading,
            status: data.status,
            route_id: data.route_id,
            next_stop_id: data.next_stop_id || null,
            next_stop_name: data.next_stop_name || null,
            eta_next_stop: data.eta_next_stop || null,
            last_updated: data.last_updated || data.timestamp,
          },
        });

        // Broadcast to route-specific room
        if (data.route_id) {
          broadcast(data.route_id, JSON.parse(payload));
        }

        // Broadcast to all connected clients
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(payload);
            } catch (err) {
              logger.warn('Failed to send vehicle update to client', { message: err.message });
            }
          }
        }
      }

      if (channel === 'vehicle:status') {
        // Status change event — minimal payload
        const payload = JSON.stringify({
          type: 'vehicle_status',
          vehicle_id: data.vehicle_id,
          old_status: data.old_status,
          new_status: data.new_status,
          timestamp: data.timestamp,
        });

        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(payload);
            } catch (err) {
              logger.warn('Failed to send status change to client', { message: err.message });
            }
          }
        }
      }
    } catch (err) {
      logger.error('WS: failed to parse message', { channel, message: err.message });
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
