const WebSocket = require('ws');
const logger = require('../utils/logger');

const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * Start a heartbeat interval for a WebSocket server.
 * Every 30 seconds, pings all connected clients.
 * Clients that have not responded to the previous ping are terminated.
 *
 * Clients must respond to pings (browsers do this automatically;
 * custom clients should handle the 'ping' event and call ws.pong()).
 *
 * @param {import('ws').Server} wss
 * @returns {NodeJS.Timeout} The interval handle (for cleanup on shutdown)
 */
function startHeartbeat(wss) {
  const interval = setInterval(() => {
    let alive = 0;
    let terminated = 0;

    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        terminated++;
        return;
      }
      ws.isAlive = false;
      ws.ping();
      alive++;
    });

    if (alive > 0 || terminated > 0) {
      logger.debug('WS heartbeat', { alive, terminated });
    }
  }, HEARTBEAT_INTERVAL_MS);

  logger.info('WebSocket heartbeat started (30s interval)');
  return interval;
}

module.exports = { startHeartbeat };
