const vehicleStatusModel = require('../../models/vehicleStatus.model');
const stateEngine = require('../../services/stateEngine.service');
const logger = require('../../utils/logger');

const startTime = Date.now();

class MetricsController {
  /**
   * GET /api/system/metrics
   * Returns aggregated system metrics:
   * - Vehicle counts by status (live, delayed, offline)
   * - Total vehicles
   * - Server uptime
   * - Timestamp
   */
  async getMetrics(req, res) {
    try {
      // Try state engine counts first (faster, in-memory)
      const engineCounts = stateEngine.getStatusCounts();

      // If the engine has data, use it; otherwise query the model
      let counts;
      if (engineCounts.total > 0) {
        counts = engineCounts;
      } else {
        // Fallback: query from model
        try {
          const vehicles = await vehicleStatusModel.getAllActiveVehicles();
          counts = {
            live: 0,
            delayed: 0,
            offline: 0,
            total: vehicles.length,
          };
          vehicles.forEach(v => {
            const s = v.status || 'offline';
            counts[s] = (counts[s] || 0) + 1;
          });
        } catch (dbErr) {
          counts = { live: 0, delayed: 0, offline: 0, total: 0 };
          logger.warn('Metrics: DB query failed, returning zeros', { error: dbErr.message });
        }
      }

      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      return res.status(200).json({
        success: true,
        metrics: {
          vehicles: {
            active: counts.live,
            delayed: counts.delayed,
            offline: counts.offline,
            total: counts.total,
          },
          server: {
            uptime_seconds: uptimeSeconds,
            uptime_human: formatUptime(uptimeSeconds),
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error('MetricsController.getMetrics error', { message: err.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  }
}

/**
 * Format seconds into human-readable uptime string.
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = new MetricsController();
