import Redis  from 'ioredis';
import logger from '../utils/logger.js';
import env    from './env.js';

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,

  retryStrategy(retries) {
    if (retries > 5) {
      logger.error('Redis: max retries reached, giving up');
      return null;
    }
    return retries * 200;
  },

  enableOfflineQueue: false,
  lazyConnect: false,
});

redis.on('connect',     () => logger.info('Redis client connected'));
redis.on('reconnecting',() => logger.warn('Redis reconnecting...'));
redis.on('error',  (err) => logger.error(`Redis error: ${err.message}`));

export default redis;
