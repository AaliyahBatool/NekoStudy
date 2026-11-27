import type { AppSocketServer } from '../../types/socket.js';

import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { PRESENCE_PREFIX, presenceKeys } from './keys.js';

const CLEANUP_INTERVAL_MS = 1_000;
const CLEANUP_BATCH_SIZE = 100;

const cleanupScript = `
  local function getHost(usersKey, ownerKey)
    local ownerId = redis.call("GET", ownerKey)

    if ownerId and redis.call("ZSCORE", usersKey, ownerId) then
      return ownerId
    end

    local earliest = redis.call("ZRANGE", usersKey, 0, 0)

    if earliest[1] then
      return earliest[1]
    end

    return ""
  end

  local userId = ARGV[1]
  local now = tonumber(ARGV[2])
  local prefix = ARGV[3]

  local deadline = redis.call("ZSCORE", KEYS[2], userId)

  if not deadline or tonumber(deadline) > now then
    return { "0", "", "", "" }
  end

  -- A reconnect cancels the deadline atomically.
  if redis.call("SCARD", KEYS[1]) > 0 then
    redis.call("ZREM", KEYS[2], userId)
    return { "0", "", "", "" }
  end

  local roomId = redis.call("GET", KEYS[3])

  if not roomId then
    redis.call("ZREM", KEYS[2], userId)
    return { "0", "", "", "" }
  end

  local usersKey = prefix .. ":room:" .. roomId .. ":users"
  local statusesKey = prefix .. ":room:" .. roomId .. ":statuses"
  local ownerKey = prefix .. ":room:" .. roomId .. ":owner"

  local hostBefore = getHost(usersKey, ownerKey)

  redis.call("ZREM", usersKey, userId)
  redis.call("HDEL", statusesKey, userId)
  redis.call("DEL", KEYS[3])
  redis.call("ZREM", KEYS[2], userId)

  local hostAfter = getHost(usersKey, ownerKey)

  return { "1", roomId, hostBefore, hostAfter }
`;

async function cleanupDueDisconnects(io: AppSocketServer): Promise<void> {
  const deadlinesKey = presenceKeys.disconnectDeadlines();
  const now = Date.now();

  const userIds = await redis.zrangebyscore(
    deadlinesKey,
    '-inf',
    now,
    'LIMIT',
    0,
    CLEANUP_BATCH_SIZE,
  );

  for (const userId of userIds) {
    const result = (await redis.eval(
      cleanupScript,
      3,
      presenceKeys.userSockets(userId),
      deadlinesKey,
      presenceKeys.userActiveRoom(userId),
      userId,
      now,
      PRESENCE_PREFIX,
    )) as string[];

    const [removed, roomId, previousHostId, hostId] = result;

    if (removed !== '1' || !roomId) continue;

    const roomChannel = `room:${roomId}`;

    io.to(roomChannel).emit('presence:left', { userId });

    if (previousHostId !== hostId) {
      io.to(roomChannel).emit('host:changed', {
        roomId,
        hostId: hostId || null,
      });
    }

    logger.debug(
      {
        userId,
        roomId,
        previousHostId: previousHostId || null,
        hostId: hostId || null,
      },
      'Disconnected user presence cleaned up',
    );
  }
}

let interval: ReturnType<typeof setInterval> | undefined;
let activeRun: Promise<void> | undefined;

export function startPresenceCleanupWorker(io: AppSocketServer): void {
  if (interval) return;

  interval = setInterval(() => {
    if (activeRun) return;

    activeRun = cleanupDueDisconnects(io)
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Presence cleanup failed');
      })
      .finally(() => {
        activeRun = undefined;
      });
  }, CLEANUP_INTERVAL_MS);

  interval.unref();
}

export async function stopPresenceCleanupWorker(): Promise<void> {
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }

  await activeRun;
}
