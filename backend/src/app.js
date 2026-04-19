const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiRouter = require('./api/routes/index');
const requestLogger = require('./middleware/requestLogger.middleware');
const { vehicleRateLimit } = require('./middleware/rateLimit.middleware');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { isoNow } = require('./utils/time.utils');

const app = express();

// Security headers
app.use(helmet());

// CORS — allow all origins for hackathon; restrict in production
app.use(cors());

// Parse JSON bodies up to 1MB
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use(requestLogger);

// Global rate limiting (applied before routes)
app.use(vehicleRateLimit);

// Health check endpoint — no auth required
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: isoNow() });
});

// Mount all API routes under /api
app.use('/api', apiRouter);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', code: 404 });
});

// Centralized error handler — must be last
app.use(errorHandler);

module.exports = app;
