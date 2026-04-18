const { createLogger, format, transports } = require('winston');
const { NODE_ENV } = require('../config/env');

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let log = `${ts} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

const logger = createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    NODE_ENV !== 'production' ? colorize() : format.uncolorize(),
    logFormat
  ),
  transports: [
    new transports.Console(),
  ],
  exitOnError: false,
});

module.exports = logger;
