/**
 * WebSocket room management.
 * Maps route IDs to sets of connected WebSocket clients.
 * @type {Map<string, Set<import('ws')>>}
 */
const rooms = new Map();

/**
 * Subscribe a WebSocket client to a route room.
 * @param {string} routeId
 * @param {import('ws')} ws
 */
function subscribe(routeId, ws) {
  if (!rooms.has(routeId)) {
    rooms.set(routeId, new Set());
  }
  rooms.get(routeId).add(ws);
}

/**
 * Unsubscribe a WebSocket client from a route room.
 * @param {string} routeId
 * @param {import('ws')} ws
 */
function unsubscribe(routeId, ws) {
  const room = rooms.get(routeId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(routeId);
    }
  }
}

/**
 * Get all subscribers for a route room.
 * @param {string} routeId
 * @returns {Set<import('ws')>}
 */
function getSubscribers(routeId) {
  return rooms.get(routeId) || new Set();
}

/**
 * Remove a WebSocket client from all rooms it is subscribed to.
 * Called on disconnect to prevent memory leaks.
 * @param {import('ws')} ws
 */
function cleanupClient(ws) {
  for (const [routeId, room] of rooms.entries()) {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(routeId);
    }
  }
}

module.exports = { subscribe, unsubscribe, getSubscribers, cleanupClient };
