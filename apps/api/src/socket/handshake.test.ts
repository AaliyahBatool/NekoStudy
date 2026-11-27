
import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';
import { io as createClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import { authenticateSocket } from './auth-middleware.js';
import type { AppSocket } from '../types/socket.js';

let ioServer: SocketIOServer | undefined;
let client: ReturnType<typeof createClient> | undefined;

afterEach(async () => {
  client?.close();
  client = undefined;

  if (ioServer) {
    await new Promise<void>((resolve) => {
      ioServer!.close(() => resolve());
    });

    ioServer = undefined;
  }
});

describe('Socket.IO handshake', () => {
  it('rejects a client that connects without an access token cookie', async () => {
    const httpServer = createServer();

    ioServer = new SocketIOServer(httpServer);

    ioServer.use((socket, next) => {
      void authenticateSocket(socket as unknown as AppSocket, next);
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(0, '127.0.0.1', resolve);
    });

    const address = httpServer.address();

    if (!address || typeof address === 'string') {
      throw new Error('Failed to obtain the test server address');
    }

    client = createClient(`http://127.0.0.1:${address.port}`, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false,
      timeout: 5_000,
    });

    const connectionError = new Promise<Error>((resolve, reject) => {
      client!.once('connect_error', resolve);
      client!.once('connect', () => {
        reject(new Error('Expected the unauthenticated connection to be rejected'));
      });
    });

    client.connect();

    const error = await connectionError;

    expect(error.message).toBe('UNAUTHENTICATED');
  });
});
