
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import app from './app.js';
import { prisma } from './lib/db.js';
import { redis } from './lib/redis.js';

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Health endpoints', () => {
  it('returns 200 for liveness without checking dependencies', async () => {
    const response = await request(app).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
    });
  });

  it('returns 200 when PostgreSQL and Redis are available', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });
  });
});

describe('Error handling', () => {
  it('returns the standard 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('returns a safe response for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/v1/scenes')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
      },
    });
  });
});
