const EARTH_RADIUS_KM = 6371;

/**
 * Project a vehicle's position forward using dead reckoning.
 * Uses the last known speed (km/h) and heading (degrees) to estimate
 * where the vehicle is now, given elapsed time in seconds.
 *
 * @param {{ lat: number, lng: number, speed_kmh: number, heading: number }} lastPing
 * @param {number} elapsedSeconds - Seconds since the last ping
 * @returns {{ lat: number, lng: number }}
 */
function interpolatePosition(lastPing, elapsedSeconds) {
  const { lat, lng, speed_kmh = 0, heading = 0 } = lastPing;

  if (speed_kmh <= 0 || elapsedSeconds <= 0) {
    return { lat, lng };
  }

  // Distance travelled in km
  const distanceKm = (speed_kmh / 3600) * elapsedSeconds;

  // Angular distance in radians
  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const headingRad = (heading * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDist) +
    Math.cos(latRad) * Math.sin(angularDist) * Math.cos(headingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDist) * Math.cos(latRad),
      Math.cos(angularDist) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

module.exports = { interpolatePosition };
