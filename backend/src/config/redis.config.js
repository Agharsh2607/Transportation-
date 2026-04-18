const Redis = require('ioredis');
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = require('./env');
const logger = require('../utils/logger');

const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

// Client used for caching and state operations
const redisCache = new Redis(redisOptions);

// Separate client dedicated to pub/sub (cannot run other commands while subscribed)
const redisPubSub = new Redis(redisOptions);

redisCache.on('connect', () => logger.info('Redis cache client connected'));
redisCache.on('error', (err) => logger.error('Redis cache error', { message: err.message }));
redisCache.on('close', () => logger.warn('Redis cache connection closed'));

redisPubSub.on('connect', () => logger.info('Redis pub/sub client connected'));
redisPubSub.on('error', (err) => logger.error('Redis pub/sub error', { message: err.message }));
redisPubSub.on('close', () => logger.warn('Redis pub/sub connection closed'));

module.exports = { redisCache, redisPubSub };
