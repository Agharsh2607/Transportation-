const wsRooms = require('./ws.rooms');
const logger = require('../utils/logger');

/**
 * Handle a new WebSocket connection.
 * Manages subscribe/unsubscribe actions and connection lifecycle.
 *
 * Client message format:
 *   { action: 'subscribe',   routeId: 'route-1' }
 *   { action: 'unsubscribe', routeId: 'route-1' }
 *
 * @param {import('ws')} ws
 * @param {import('http').IncomingMessage} req
 */
function handleConnection(ws, req) {
  // Mark as alive for heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Transit Live Updates. Send { action: "subscribe", routeId: "<id>" } to start.',
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (rawData) => {
    let msg;
    try {
      msg = JSON.parse(rawData.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    const { action, routeId } = msg;

    if (!routeId) {
      ws.send(JSON.stringify({ type: 'error', message: 'routeId is required' }));
      return;
    }

    switch (action) {
      case 'subscribe':
        wsRooms.subscribe(routeId, ws);
        ws.send(JSON.stringify({ type: 'subscribed', routeId }));
        logger.debug('WS client subscribed', { routeId, ip: req.socket.remoteAddress });
        break;

      case 'unsubscribe':
        wsRooms.unsubscribe(routeId, ws);
        ws.send(JSON.stringify({ type: 'unsubscribed', routeId }));
        logger.debug('WS client unsubscribed', { routeId });
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${action}` }));
    }
  });

  ws.on('close', (code, reason) => {
    wsRooms.cleanupClient(ws);
    logger.info('WebSocket client disconnected', { code, reason: reason.toString() });
  });

  ws.on('error', (err) => {
    logger.error('WebSocket client error', { message: err.message });
    wsRooms.cleanupClient(ws);
  });
}

module.exports = { handleConnection };
