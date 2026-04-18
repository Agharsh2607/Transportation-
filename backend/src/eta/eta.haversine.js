const { haversineKm } = require('../utils/geo.utils');

/**
 * Re-export haversineKm for use within the ETA subsystem.
 * Calculates the great-circle distance between two coordinates.
 * @type {function(number, number, number, number): number}
 */
module.exports.haversineKm = haversineKm;

/**
 * Calculate the distance in km from a vehicle's current position to a stop.
 * @param {{ lat: number, lng: number }} vehicle - Vehicle with current lat/lng
 * @param {{ lat: number, lng: number }} stop - Stop with lat/lng
 * @returns {number} Distance in kilometres
 */
function distanceToStop(vehicle, stop) {
  return haversineKm(vehicle.lat, vehicle.lng, stop.lat, stop.lng);
}

module.exports.distanceToStop = distanceToStop;
