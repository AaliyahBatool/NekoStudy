import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getHealth, getScenes } from '../api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it('fetches scenes with credentials and parses the response', async () => {
    const scenes = [
      {
        id: 'forest-cabin',
        name: 'Forest Cabin',
        category: 'Nature',
        thumbnailUrl: '/assets/forest-cabin.jpg',
        ambientAudioUrl: null,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(scenes), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getScenes()).resolves.toEqual(scenes);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/scenes', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  });

  it('converts API errors into ApiError instances', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Database unavailable',
            },
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    await expect(getHealth()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Database unavailable',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('converts network failures into ApiError instances', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network failure')));

    await expect(getScenes()).rejects.toBeInstanceOf(ApiError);
    await expect(getScenes()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
