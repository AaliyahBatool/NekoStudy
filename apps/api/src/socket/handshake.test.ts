import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';
import { io as createClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from '@nekostudy/shared';
import type { SocketData } from '../types/socket.js';

import { authenticateSocket } from './auth-middleware.js';

type TestSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let ioServer: TestSocketServer | undefined;
let client: ReturnType<typeof createClient> | undefined;

afterEach(async () => {
  if (client) {
    client.close();
    client = undefined;
  }

  if (ioServer) {
    await ioServer.close();
    ioServer = undefined;
  }
});

describe('Socket.IO handshake', () => {
  it('rejects a client that connects without an access token cookie', async () => {
    const httpServer = createServer();

    ioServer = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer);

    ioServer.use((socket, next) => {
      void authenticateSocket(socket, next);
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

    const socketClient = client;

    const connectionError = new Promise<Error>((resolve, reject) => {
      socketClient.once('connect_error', resolve);
      socketClient.once('connect', () => {
        reject(new Error('Expected the unauthenticated connection to be rejected'));
      });
    });

    void socketClient.connect();

    const error = await connectionError;

    expect(error.message).toBe('UNAUTHENTICATED');
  });
});
