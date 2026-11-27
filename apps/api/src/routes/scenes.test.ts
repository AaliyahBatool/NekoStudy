import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app.js';
import { prisma } from '../lib/db.js';

const sceneId = 'b2000000-0000-4000-8000-000000000001';

describe('Scenes API', () => {
  beforeAll(async () => {
    await prisma.scene.upsert({
      where: { id: sceneId },
      create: {
        id: sceneId,
        name: 'Integration Test Scene',
        category: 'test',
        assetKey: 'scenes/integration-test.mp4',
        thumbnailKey: 'thumbnails/integration-test.jpg',
        ambientAudioUrl: null,
        licenseNote: 'Test fixture',
      },
      update: {
        name: 'Integration Test Scene',
        category: 'test',
        assetKey: 'scenes/integration-test.mp4',
        thumbnailKey: 'thumbnails/integration-test.jpg',
        ambientAudioUrl: null,
        licenseNote: 'Test fixture',
      },
    });
  });

  afterAll(async () => {
    await prisma.scene.deleteMany({
      where: { id: sceneId },
    });
  });

  it('returns scenes from PostgreSQL with thumbnail URLs built from ASSET_BASE_URL', async () => {
    const response = await request(app).get('/api/v1/scenes');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    expect(response.body).toContainEqual(
      expect.objectContaining({
        id: sceneId,
        name: 'Integration Test Scene',
        category: 'test',
        thumbnailUrl: 'http://localhost:4001/assets/thumbnails/integration-test.jpg',
        ambientAudioUrl: null,
      }),
    );
  });
});
