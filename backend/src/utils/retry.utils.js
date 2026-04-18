const MAX_DELAY_MS = 60000;

/**
 * Calculate exponential backoff delay for a given attempt number.
 * Formula: 1000 * 2^attempt, capped at 60000ms.
 * @param {number} attempt - Zero-based attempt index
 * @returns {number} Delay in milliseconds
 */
function exponentialBackoff(attempt) {
  const delay = 1000 * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY_MS);
}

module.exports = { exponentialBackoff };
