import { Redis } from 'ioredis';

import { env } from '../config/env.js';
import { logger } from './logger.js';

const ERROR_LOG_INTERVAL_MS = 30_000;

let lastErrorLogAt = 0;
let suppressedErrorCount = 0;

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times: number) {
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (error: Error) => {
  const now = Date.now();

  if (now - lastErrorLogAt < ERROR_LOG_INTERVAL_MS) {
    suppressedErrorCount++;
    return;
  }

  logger.error(
    {
      err: error,
      suppressedErrors: suppressedErrorCount,
    },
    'Redis connection error',
  );

  lastErrorLogAt = now;
  suppressedErrorCount = 0;
});
