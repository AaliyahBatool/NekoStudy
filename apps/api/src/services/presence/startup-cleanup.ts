
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { PRESENCE_PREFIX, presenceKeys } from "./keys.js";

const SCAN_COUNT = 100;
const UNLINK_BATCH_SIZE = 100;

/**
 * Delete every key matching a presence-only pattern.
 *
 * SCAN avoids blocking Redis with KEYS.
 * UNLINK removes keys asynchronously where possible.
 */
async function deleteMatchingKeys(pattern: string): Promise<number> {
  let cursor = "0";
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      SCAN_COUNT,
    );

    cursor = nextCursor;

    for (let i = 0; i < keys.length; i += UNLINK_BATCH_SIZE) {
      const batch = keys.slice(i, i + UNLINK_BATCH_SIZE);

      if (batch.length > 0) {
        deletedCount += await redis.unlink(...batch);
      }
    }
  } while (cursor !== "0");

  return deletedCount;
}

/**
 * Remove ephemeral presence left behind by a previous API process.
 *
 * Intentionally preserves room chat and agenda-version keys.
 */
export async function clearStalePresence(): Promise<void> {
  const patterns = [
    `${PRESENCE_PREFIX}:room:*:users`,
    `${PRESENCE_PREFIX}:room:*:statuses`,
    `${PRESENCE_PREFIX}:room:*:owner`,
    `${PRESENCE_PREFIX}:user:*:sockets`,
    `${PRESENCE_PREFIX}:user:*:active-room`,
  ];

  let totalDeleted = 0;

  for (const pattern of patterns) {
    totalDeleted += await deleteMatchingKeys(pattern);
  }

  // This sorted set contains pending disconnect cleanup deadlines.
  totalDeleted += await redis.unlink(presenceKeys.disconnectDeadlines());

  logger.info(
    { deletedKeys: totalDeleted },
    "Stale Redis presence cleared",
  );
}
