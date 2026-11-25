
import { redis } from "../../lib/redis.js";
import { presenceKeys } from "./keys.js";

const DISCONNECT_GRACE_MS = 10_000;


export async function registerSocket(
  userId: string,
  socketId: string,
): Promise<void> {
  const script = `
    redis.call("SADD", KEYS[1], ARGV[1])
    redis.call("ZREM", KEYS[2], ARGV[2])
    return 1
  `;

  await redis.eval(
    script,
    2,
    presenceKeys.userSockets(userId),
    presenceKeys.disconnectDeadlines(),
    socketId,
    userId,
  );
}


export async function unregisterSocket(
  userId: string,
  socketId: string,
): Promise<{ lastSocket: boolean }> {
  const socketsKey = presenceKeys.userSockets(userId);
  const deadlinesKey = presenceKeys.disconnectDeadlines();

  const script = `
    redis.call("SREM", KEYS[1], ARGV[1])

    local socketCount = redis.call("SCARD", KEYS[1])

    if socketCount == 0 then
      redis.call("DEL", KEYS[1])
      redis.call(
        "ZADD",
        KEYS[2],
        ARGV[2],
        ARGV[3]
      )
      return 1
    end

    return 0
  `;

  const result = await redis.eval(
    script,
    2,
    socketsKey,
    deadlinesKey,
    socketId,
    Date.now() + DISCONNECT_GRACE_MS,
    userId,
  );

  return { lastSocket: result === 1 };
}
