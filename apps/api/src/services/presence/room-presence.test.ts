import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { redis } from '../../lib/redis.js';
import { presenceKeys } from './keys.js';
import { joinRoomPresence, leaveRoomPresence } from './room-presence.js';
import { registerSocket, unregisterSocket } from './socket-registry.js';

const userIds = new Set<string>();
const roomIds = new Set<string>();

function newUser(): string {
  const userId = `test-${randomUUID()}`;
  userIds.add(userId);
  return userId;
}

function newRoom(): string {
  const roomId = `test-${randomUUID()}`;
  roomIds.add(roomId);
  return roomId;
}

async function connectUser(userId: string): Promise<string> {
  const socketId = `socket-${randomUUID()}`;
  await registerSocket(userId, socketId);
  return socketId;
}

afterEach(async () => {
  const keys = [
    ...[...userIds].flatMap((userId) => [
      presenceKeys.userSockets(userId),
      presenceKeys.userActiveRoom(userId),
    ]),
    ...[...roomIds].flatMap((roomId) => [
      presenceKeys.roomUsers(roomId),
      presenceKeys.roomStatuses(roomId),
      presenceKeys.roomOwner(roomId),
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
});

afterAll(() => {
  redis.disconnect();
});

describe('Socket registry', () => {
  it('keeps a user connected while at least one socket remains', async () => {
    const userId = newUser();

    const firstSocket = await connectUser(userId);
    const secondSocket = await connectUser(userId);

    const firstResult = await unregisterSocket(userId, firstSocket);

    expect(firstResult).toEqual({ lastSocket: false });
    expect(await redis.scard(presenceKeys.userSockets(userId))).toBe(1);

    const secondResult = await unregisterSocket(userId, secondSocket);

    expect(secondResult).toEqual({ lastSocket: true });
    expect(await redis.exists(presenceKeys.userSockets(userId))).toBe(0);

    const deadline = await redis.zscore(presenceKeys.disconnectDeadlines(), userId);

    expect(deadline).not.toBeNull();
    expect(Number(deadline)).toBeGreaterThan(Date.now());
  });

  it('cancels a pending disconnect deadline when the user reconnects', async () => {
    const userId = newUser();

    const socketId = await connectUser(userId);

    await unregisterSocket(userId, socketId);

    expect(await redis.zscore(presenceKeys.disconnectDeadlines(), userId)).not.toBeNull();

    await connectUser(userId);

    expect(await redis.zscore(presenceKeys.disconnectDeadlines(), userId)).toBeNull();
    expect(await redis.scard(presenceKeys.userSockets(userId))).toBe(1);
  });
});

describe('Room presence', () => {
  it('rejects a room join when the user has no registered socket', async () => {
    const userId = newUser();
    const roomId = newRoom();

    const result = await joinRoomPresence({
      roomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    expect(result).toEqual({
      status: 'not_connected',
      previousRoomId: null,
      hostChanges: [],
    });
  });

  it('assigns the earliest member as host, then gives priority to the owner', async () => {
    const roomId = newRoom();
    const memberId = newUser();
    const ownerId = newUser();

    await connectUser(memberId);

    const firstJoin = await joinRoomPresence({
      roomId,
      userId: memberId,
      ownerId,
      maxMembers: 5,
    });

    expect(firstJoin.status).toBe('joined');

    if (firstJoin.status !== 'joined') {
      throw new Error('Expected first join to succeed');
    }

    expect(firstJoin.hostChanges).toEqual([
      {
        roomId,
        previousHostId: null,
        hostId: memberId,
      },
    ]);

    await connectUser(ownerId);

    const ownerJoin = await joinRoomPresence({
      roomId,
      userId: ownerId,
      ownerId,
      maxMembers: 5,
    });

    expect(ownerJoin.status).toBe('joined');

    if (ownerJoin.status !== 'joined') {
      throw new Error('Expected owner join to succeed');
    }

    expect(ownerJoin.hostChanges).toEqual([
      {
        roomId,
        previousHostId: memberId,
        hostId: ownerId,
      },
    ]);
  });

  it('does not duplicate membership when a user joins the same room again', async () => {
    const roomId = newRoom();
    const userId = newUser();

    await connectUser(userId);

    await joinRoomPresence({
      roomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    const result = await joinRoomPresence({
      roomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    expect(result).toEqual({
      status: 'already_present',
      previousRoomId: null,
      hostChanges: [],
    });

    expect(await redis.zcard(presenceKeys.roomUsers(roomId))).toBe(1);
  });

  it('rejects a join when the room is full', async () => {
    const roomId = newRoom();
    const ownerId = newUser();
    const secondUserId = newUser();

    await connectUser(ownerId);
    await connectUser(secondUserId);

    await joinRoomPresence({
      roomId,
      userId: ownerId,
      ownerId,
      maxMembers: 1,
    });

    const result = await joinRoomPresence({
      roomId,
      userId: secondUserId,
      ownerId,
      maxMembers: 1,
    });

    expect(result).toEqual({
      status: 'room_full',
      previousRoomId: null,
      hostChanges: [],
    });

    expect(await redis.zcard(presenceKeys.roomUsers(roomId))).toBe(1);
  });

  it('transfers host when the owner leaves and clears host when the room becomes empty', async () => {
    const roomId = newRoom();
    const memberId = newUser();
    const ownerId = newUser();

    await connectUser(memberId);
    await connectUser(ownerId);

    await joinRoomPresence({
      roomId,
      userId: memberId,
      ownerId,
      maxMembers: 5,
    });

    await joinRoomPresence({
      roomId,
      userId: ownerId,
      ownerId,
      maxMembers: 5,
    });

    const ownerLeave = await leaveRoomPresence(ownerId);

    expect(ownerLeave).toEqual({
      status: 'left',
      roomId,
      hostChange: {
        roomId,
        previousHostId: ownerId,
        hostId: memberId,
      },
    });

    const memberLeave = await leaveRoomPresence(memberId);

    expect(memberLeave).toEqual({
      status: 'left',
      roomId,
      hostChange: {
        roomId,
        previousHostId: memberId,
        hostId: null,
      },
    });

    expect(await redis.zcard(presenceKeys.roomUsers(roomId))).toBe(0);
  });

  it('removes a user from their previous room when joining another room', async () => {
    const previousRoomId = newRoom();
    const targetRoomId = newRoom();
    const userId = newUser();

    await connectUser(userId);

    await joinRoomPresence({
      roomId: previousRoomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    const result = await joinRoomPresence({
      roomId: targetRoomId,
      userId,
      ownerId: userId,
      maxMembers: 5,
    });

    expect(result.status).toBe('joined');

    if (result.status !== 'joined') {
      throw new Error('Expected room switch to succeed');
    }

    expect(result.previousRoomId).toBe(previousRoomId);

    expect(result.hostChanges).toEqual(
      expect.arrayContaining([
        {
          roomId: previousRoomId,
          previousHostId: userId,
          hostId: null,
        },
        {
          roomId: targetRoomId,
          previousHostId: null,
          hostId: userId,
        },
      ]),
    );

    expect(await redis.zcard(presenceKeys.roomUsers(previousRoomId))).toBe(0);
    expect(await redis.zcard(presenceKeys.roomUsers(targetRoomId))).toBe(1);
    expect(await redis.get(presenceKeys.userActiveRoom(userId))).toBe(targetRoomId);
  });
});
