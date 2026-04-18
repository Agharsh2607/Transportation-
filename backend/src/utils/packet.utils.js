/**
 * Normalize a raw GPS packet from a vehicle.
 * Trims string fields and coerces numeric fields.
 * @param {object} body
 * @returns {object}
 */
function parsePacket(body) {
  return {
    vehicle_id: typeof body.vehicle_id === 'string' ? body.vehicle_id.trim() : String(body.vehicle_id || ''),
    lat: parseFloat(body.lat),
    lng: parseFloat(body.lng),
    speed_kmh: parseFloat(body.speed_kmh) || 0,
    heading: parseFloat(body.heading) || 0,
    seq: parseInt(body.seq, 10) || 0,
    replayed: Boolean(body.replayed),
    signal_strength: typeof body.signal_strength === 'string' ? body.signal_strength.trim() : 'good',
    timestamp: typeof body.timestamp === 'string' ? body.timestamp.trim() : new Date().toISOString(),
  };
}

/**
 * Determine if a packet is a replayed (historical) packet.
 * A packet is considered replayed if the replayed flag is set,
 * or if its timestamp is more than 5 minutes in the past.
 * @param {object} packet
 * @returns {boolean}
 */
function isReplayedPacket(packet) {
  if (packet.replayed === true) return true;
  if (packet.timestamp) {
    const packetTime = new Date(packet.timestamp).getTime();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return packetTime < fiveMinutesAgo;
  }
  return false;
}

/**
 * Normalize input to always return an array of packets.
 * Handles both a single packet object and an array of packets.
 * @param {object|Array} body
 * @returns {Array<object>}
 */
function batchToPackets(body) {
  if (Array.isArray(body)) {
    return body.map(parsePacket);
  }
  if (body && typeof body === 'object') {
    // Support { packets: [...] } envelope
    if (Array.isArray(body.packets)) {
      return body.packets.map(parsePacket);
    }
    return [parsePacket(body)];
  }
  return [];
}

module.exports = { parsePacket, isReplayedPacket, batchToPackets };
