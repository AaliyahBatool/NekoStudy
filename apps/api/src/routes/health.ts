import { Router, type Router as RouterType } from 'express';

import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

const router: RouterType = Router();

// Liveness: confirms that the API process is responding.
router.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

// Readiness: confirms PostgreSQL and Redis are reachable.
router.get('/', async (_req, res) => {
  const [databaseResult, redisResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const databaseConnected = databaseResult.status === 'fulfilled';
  const redisConnected = redisResult.status === 'fulfilled' && redisResult.value === 'PONG';

  if (!databaseConnected) {
    logger.error(
      { err: databaseResult.status === 'rejected' ? databaseResult.reason : undefined },
      'DB health check failed',
    );
  }

  if (!redisConnected) {
    logger.error(
      { err: redisResult.status === 'rejected' ? redisResult.reason : undefined },
      'Redis health check failed',
    );
  }

  const healthy = databaseConnected && redisConnected;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'error',
    database: databaseConnected ? 'connected' : 'disconnected',
    redis: redisConnected ? 'connected' : 'disconnected',
  });
});

export default router;
