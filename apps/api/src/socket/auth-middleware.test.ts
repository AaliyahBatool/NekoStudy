
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppSocket } from '../types/socket.js';

import { verifyToken } from '../lib/auth.js';
import { authenticateSocket } from './auth-middleware.js';

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn(),
}));

function createSocket(cookieHeader?: string): AppSocket {
  return {
    handshake: {
      headers: {
        cookie: cookieHeader,
      },
    },
    data: {},
  } as unknown as AppSocket;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('Socket authentication middleware', () => {
  it('rejects a handshake without an access-token cookie', async () => {
    const socket = createSocket();
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0]?.[0]?.message).toBe('UNAUTHENTICATED');
    expect(verifyToken).not.toHaveBeenCalled();
    expect(socket.data.userId).toBeUndefined();
  });

  it('rejects an invalid access token', async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);

    const socket = createSocket('access_token=invalid-token');
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]?.message).toBe('UNAUTHENTICATED');
    expect(socket.data.userId).toBeUndefined();
  });

  it('rejects when token verification throws', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('Verification failed'));

    const socket = createSocket('access_token=broken-token');
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]?.message).toBe('UNAUTHENTICATED');
    expect(socket.data.userId).toBeUndefined();
  });

  it('does not accept a similarly named cookie', async () => {
    const socket = createSocket('other_token=some-token');
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(verifyToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]?.message).toBe('UNAUTHENTICATED');
  });
});
