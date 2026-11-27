import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { redis } from '../../lib/redis.js';
import type { AppSocketServer } from '../../types/socket.js';
import { presenceKeys } from './keys.js';
import { startPresenceCleanupWorker, stopPresenceCleanupWorker } from './cleanup-worker.js';
import { clearStalePresence } from './startup-cleanup.js';
import { joinRoomPresence } from './room-presence.js';
import { registerSocket, unregisterSocket } from './socket-registry.js';

const userIds = new Set<string>();
const roomIds = new Set<string>();

function newUser(): string {
  const id = `test-${randomUUID()}`;
  userIds.add(id);
  return id;
}

function newRoom(): string {
  const id = `test-${randomUUID()}`;
  roomIds.add(id);
  return id;
}

async function cleanupTestKeys(): Promise<void> {
  const keys = [
    ...[...userIds].flatMap((userId) => [
      presenceKeys.userSockets(userId),
      presenceKeys.userActiveRoom(userId),
    ]),
    ...[...roomIds].flatMap((roomId) => [
      presenceKeys.roomUsers(roomId),
      presenceKeys.roomStatuses(roomId),
      presenceKeys.roomOwner(roomId),
      presenceKeys.roomChat(roomId),
      presenceKeys.roomAgendaVersion(roomId),
    ]),
  ];

  if (keys.length > 0) {
    await redis.del(...keys);
  }

  if (userIds.size > 0) {
    await redis.zrem(presenceKeys.disconnectDeadlines(), ...userIds);
  }

  userIds.clear();
  roomIds.clear();
}

afterEach(cleanupTestKeys);

afterAll(async () => {
  await stopPresenceCleanupWorker();
  redis.disconnect();
});

describe('Startup presence cleanup', () => {
  it('removes stale presence keys while preserving chat and agenda versions', async () => {
    const userId = newUser();
    const roomId = newRoom();

    await redis.sadd(presenceKeys.userSockets(userId), 'stale-socket');
    await redis.set(presenceKeys.userActiveRoom(userId), roomId);
    await redis.zadd(presenceKeys.roomUsers(roomId), Date.now(), userId);
    await redis.hset(presenceKeys.roomStatuses(roomId), userId, 'focusing');
    await redis.set(presenceKeys.roomOwner(roomId), userId);
    await redis.zadd(presenceKeys.disconnectDeadlines(), Date.now(), userId);

    await redis.set(presenceKeys.roomChat(roomId), 'preserve-chat');
    await redis.set(presenceKeys.roomAgendaVersion(roomId), '7');

    await clearStalePresence();

    expect(await redis.exists(presenceKeys.userSockets(userId))).toBe(0);
    expect(await redis.exists(presenceKeys.userActiveRoom(userId))).toBe(0);
    expect(await redis.exists(presenceKeys.roomUsers(roomId))).toBe(0);
    expect(await redis.exists(presenceKeys.roomStatuses(roomId))).toBe(0);
    expect(await redis.exists(presenceKeys.roomOwner(roomId))).toBe(0);
    expect(await redis.zscore(presenceKeys.disconnectDeadlines(), userId)).toBeNull();

    expect(await redis.get(presenceKeys.roomChat(roomId))).toBe('preserve-chat');
    expect(await redis.get(presenceKeys.roomAgendaVersion(roomId))).toBe('7');
  });
});

describe('Disconnect cleanup worker', () => {
  it('removes an expired disconnected user and emits presence and host events', async () => {
    const userId = newUser();
    const roomId = newRoom();

    const socketId = `socket-${randomUUID()}`;
    await registerSocket(userId, socketId);

    const joinResult = await joinRoomPresence({
      roomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    expect(joinResult.status).toBe('joined');

    await unregisterSocket(userId, socketId);

    // Expire the grace period immediately rather than waiting 10 seconds.
    await redis.zadd(presenceKeys.disconnectDeadlines(), 0, userId);

    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const io = {
      to,
    } as unknown as AppSocketServer;

    try {
      startPresenceCleanupWorker(io);

      // The worker checks for expired disconnects every second.
      await new Promise((resolve) => setTimeout(resolve, 1_300));
    } finally {
      await stopPresenceCleanupWorker();
    }

    expect(await redis.zscore(presenceKeys.roomUsers(roomId), userId)).toBeNull();
    expect(await redis.hexists(presenceKeys.roomStatuses(roomId), userId)).toBe(0);
    expect(await redis.get(presenceKeys.userActiveRoom(userId))).toBeNull();
    expect(await redis.zscore(presenceKeys.disconnectDeadlines(), userId)).toBeNull();

    expect(to).toHaveBeenCalledWith(`room:${roomId}`);
    expect(emit).toHaveBeenCalledWith('presence:left', { userId });
    expect(emit).toHaveBeenCalledWith('host:changed', {
      roomId,
      hostId: null,
    });
  });
});
