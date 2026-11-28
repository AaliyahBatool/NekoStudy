import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { copy } from '../../copy';
import { HomePage } from '../HomePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('renders scenes and connected service status from the API', async () => {
    const scenes = [
      {
        id: 'forest-cabin',
        name: 'Forest Cabin',
        category: 'Nature',
        thumbnailUrl: '/assets/forest-cabin.jpg',
        ambientAudioUrl: null,
      },
      {
        id: 'ocean-view',
        name: 'Ocean View',
        category: 'Nature',
        thumbnailUrl: '/assets/ocean-view.jpg',
        ambientAudioUrl: null,
      },
      {
        id: 'quiet-cafe',
        name: 'Quiet Cafe',
        category: 'Cafe',
        thumbnailUrl: '/assets/quiet-cafe.jpg',
        ambientAudioUrl: null,
      },
      {
        id: 'rainy-library',
        name: 'Rainy Library',
        category: 'Library',
        thumbnailUrl: '/assets/rainy-library.jpg',
        ambientAudioUrl: null,
      },
    ];

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (requestUrl === '/api/v1/scenes') {
        return Promise.resolve(
          new Response(JSON.stringify(scenes), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }

      if (requestUrl === '/api/v1/health') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'ok',
              database: 'connected',
              redis: 'connected',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        );
      }

      throw new Error(`Unexpected API request: ${requestUrl}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Forest Cabin')).toBeTruthy();
    expect(screen.getByText('Ocean View')).toBeTruthy();
    expect(screen.getByText('Quiet Cafe')).toBeTruthy();
    expect(screen.getByText('Rainy Library')).toBeTruthy();
    expect(screen.getByText(copy.status.connected)).toBeTruthy();

    expect(document.querySelectorAll('.scene-card')).toHaveLength(4);

    queryClient.clear();
  });
});
