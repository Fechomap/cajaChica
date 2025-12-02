import { Redis } from 'ioredis';

import { env, isDev } from '../../config/index.js';
import { logger } from '../logging/logger.js';

export function createRedisClient(): Redis {
  const redisUrl = env.REDIS_URL;
  // DB 0 = production, DB 1 = development
  const redisDb = env.REDIS_DB ?? (isDev ? 1 : 0);

  const client = redisUrl
    ? new Redis(redisUrl, {
        db: redisDb,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      })
    : new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        db: redisDb,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

  client.on('connect', () => {
    logger.info({ db: redisDb }, 'Redis connecting...');
  });

  client.on('ready', () => {
    logger.info({ db: redisDb }, 'Redis connected and ready');
  });

  client.on('error', (err: Error) => {
    logger.error({ err }, 'Redis error');
  });

  client.on('close', () => {
    logger.info('Redis connection closed');
  });

  return client;
}

export async function connectRedis(redis: Redis): Promise<void> {
  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis ping successful');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Redis');
    throw error;
  }
}

export async function disconnectRedis(redis: Redis): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}
