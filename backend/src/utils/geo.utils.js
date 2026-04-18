const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the great-circle distance between two coordinates using the Haversine formula.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometres
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Snap a coordinate to the nearest point on a polyline.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{lat: number, lng: number}>} polylineArray
 * @returns {{ lat: number, lng: number, index: number }}
 */
function snapToPolyline(lat, lng, polylineArray) {
  if (!polylineArray || polylineArray.length === 0) {
    return { lat, lng, index: -1 };
  }

  let minDist = Infinity;
  let nearest = polylineArray[0];
  let nearestIndex = 0;

  for (let i = 0; i < polylineArray.length; i++) {
    const point = polylineArray[i];
    const dist = haversineKm(lat, lng, point.lat, point.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
      nearestIndex = i;
    }
  }

  return { lat: nearest.lat, lng: nearest.lng, index: nearestIndex };
}

/**
 * Calculate the compass bearing from point 1 to point 2.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Bearing in degrees (0-360)
 */
function bearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

module.exports = { haversineKm, snapToPolyline, bearingDegrees };
