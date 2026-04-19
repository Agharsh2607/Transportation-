const WebSocket = require('ws');
const wsRooms = require('./ws.rooms');
const logger = require('../utils/logger');

/**
 * Broadcast a data payload to all WebSocket clients subscribed to a route room.
 * Dead connections (CLOSING or CLOSED) are automatically removed from the room.
 *
 * @param {string} routeId
 * @param {object} data
 */
function broadcast(routeId, data) {
  const subscribers = wsRooms.getSubscribers(routeId);
  if (subscribers.size === 0) return;

  const payload = JSON.stringify(data);
  const dead = [];

  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        logger.warn('ws.broadcaster: send failed, marking dead', { message: err.message });
        dead.push(ws);
      }
    } else {
      dead.push(ws);
    }
  }

  // Clean up dead connections
  for (const ws of dead) {
    wsRooms.cleanupClient(ws);
  }
}

module.exports = { broadcast };
