/**
 * Returns the hour of the day (0-23) for a given Date object.
 * @param {Date} date
 * @returns {number}
 */
function hourBucket(date) {
  return date.getHours();
}

/**
 * Returns the day of the week (0=Sunday, 6=Saturday) for a given Date object.
 * @param {Date} date
 * @returns {number}
 */
function dayOfWeek(date) {
  return date.getDay();
}

/**
 * Returns the current time as an ISO 8601 string.
 * @returns {string}
 */
function isoNow() {
  return new Date().toISOString();
}

/**
 * Returns the number of seconds elapsed since the given ISO timestamp.
 * @param {string} isoString
 * @returns {number}
 */
function secondsAgo(isoString) {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 1000));
}

module.exports = { hourBucket, dayOfWeek, isoNow, secondsAgo };
