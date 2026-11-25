import { redis } from "../../lib/redis.js";
import { presenceKeys, PRESENCE_PREFIX } from "./keys.js";

export interface HostTransition {
  roomId: string;
  previousHostId: string | null;
  hostId: string | null;
}

export type RoomJoinResult =
  | {
      status: "joined";
      previousRoomId: string | null;
      hostChanges: HostTransition[];
    }
  | {
      status: "already_present";
      previousRoomId: null;
      hostChanges: [];
    }
  | {
      status: "room_full";
      previousRoomId: null;
      hostChanges: [];
    }
  | {
      status: "not_connected";
      previousRoomId: null;
      hostChanges: [];
    };

export type RoomLeaveResult =
  | {
      status: "left";
      roomId: string;
      hostChange: HostTransition | null;
    }
  | {
      status: "not_in_room";
    };

const joinRoomScript = `
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
  local targetRoomId = ARGV[2]
  local joinedAt = tonumber(ARGV[3])
  local maxMembers = tonumber(ARGV[4])
  local initialStatus = ARGV[5]
  local prefix = ARGV[6]
  local ownerId = ARGV[7]

  if redis.call("SCARD", KEYS[4]) == 0 then
    return { "not_connected", "", "", "", "", "" }
  end

  redis.call("SET", KEYS[6], ownerId)

  local previousRoomId = redis.call("GET", KEYS[3])
  local targetScore = redis.call("ZSCORE", KEYS[1], userId)

  -- This user is already present in the requested room.
  if previousRoomId == targetRoomId or (not previousRoomId and targetScore) then
    redis.call("SET", KEYS[3], targetRoomId)
    redis.call("ZADD", KEYS[1], "NX", joinedAt, userId)
    redis.call("HSETNX", KEYS[2], userId, initialStatus)
    redis.call("ZREM", KEYS[5], userId)

    local currentHost = getHost(KEYS[1], KEYS[6])

    return {
      "already_present",
      "",
      "",
      "",
      currentHost,
      currentHost
    }
  end

  local targetHostBefore = getHost(KEYS[1], KEYS[6])
  local previousHostBefore = ""

  local previousUsersKey = ""
  local previousStatusesKey = ""

  if previousRoomId then
    previousUsersKey =
      prefix .. ":room:" .. previousRoomId .. ":users"

    previousStatusesKey =
      prefix .. ":room:" .. previousRoomId .. ":statuses"

    local previousOwnerKey =
      prefix .. ":room:" .. previousRoomId .. ":owner"

    previousHostBefore = getHost(
      previousUsersKey,
      previousOwnerKey
    )
  end

  -- Remove stale target-room presence before checking capacity.
  if targetScore then
    redis.call("ZREM", KEYS[1], userId)
    redis.call("HDEL", KEYS[2], userId)
  end

  local currentCount = redis.call("ZCARD", KEYS[1])

  if currentCount >= maxMembers then
    return { "room_full", "", "", "", "", "" }
  end

  -- Remove the user from their previous room.
  if previousRoomId then
    redis.call("ZREM", previousUsersKey, userId)
    redis.call("HDEL", previousStatusesKey, userId)
  end

  -- Add the user to the target room.
  redis.call("ZADD", KEYS[1], joinedAt, userId)
  redis.call("HSET", KEYS[2], userId, initialStatus)
  redis.call("SET", KEYS[3], targetRoomId)
  redis.call("ZREM", KEYS[5], userId)

  local targetHostAfter = getHost(KEYS[1], KEYS[6])
  local previousHostAfter = ""

  if previousRoomId then
    local previousOwnerKey =
      prefix .. ":room:" .. previousRoomId .. ":owner"

    previousHostAfter = getHost(
      previousUsersKey,
      previousOwnerKey
    )
  end

  return {
    "joined",
    previousRoomId or "",
    previousHostBefore,
    previousHostAfter,
    targetHostBefore,
    targetHostAfter
  }
`;

export async function joinRoomPresence(input: {
  roomId: string;
  userId: string;
  ownerId: string;
  joinedAt: Date;
  maxMembers: number;
}): Promise<RoomJoinResult> {
  const result = (await redis.eval(
    joinRoomScript,
    6,
    presenceKeys.roomUsers(input.roomId),
    presenceKeys.roomStatuses(input.roomId),
    presenceKeys.userActiveRoom(input.userId),
    presenceKeys.userSockets(input.userId),
    presenceKeys.disconnectDeadlines(),
    presenceKeys.roomOwner(input.roomId),
    input.userId,
    input.roomId,
    input.joinedAt.getTime(),
    input.maxMembers,
    "focusing",
    PRESENCE_PREFIX,
    input.ownerId,
  )) as string[];

  const [
    status,
    previousRoomId,
    previousHostBefore,
    previousHostAfter,
    targetHostBefore,
    targetHostAfter,
  ] = result;

  if (status === "not_connected") {
    return {
      status,
      previousRoomId: null,
      hostChanges: [],
    };
  }

  if (status === "room_full") {
    return {
      status,
      previousRoomId: null,
      hostChanges: [],
    };
  }

  if (status === "already_present") {
    return {
      status,
      previousRoomId: null,
      hostChanges: [],
    };
  }

  const hostChanges: HostTransition[] = [];

  if (previousRoomId && previousHostBefore !== previousHostAfter) {
    hostChanges.push({
      roomId: previousRoomId,
      previousHostId: previousHostBefore || null,
      hostId: previousHostAfter || null,
    });
  }

  if (targetHostBefore !== targetHostAfter) {
    hostChanges.push({
      roomId: input.roomId,
      previousHostId: targetHostBefore || null,
      hostId: targetHostAfter || null,
    });
  }

  return {
    status: "joined",
    previousRoomId: previousRoomId || null,
    hostChanges,
  };
}

const leaveRoomScript = `
  local roomId = redis.call("GET", KEYS[1])

-- Cancel any pending disconnect cleanup for this user.
redis.call("ZREM", KEYS[2], userId)

if not roomId then
  return { "not_in_room", "", "", "" }
end

local usersKey = prefix .. ":room:" .. roomId .. ":users"
local statusesKey = prefix .. ":room:" .. roomId .. ":statuses"
local ownerKey = prefix .. ":room:" .. roomId .. ":owner"
`;

export async function leaveRoomPresence(
  userId: string,
): Promise<RoomLeaveResult> {
  const result = (await redis.eval(
    leaveRoomScript,
    2,
    presenceKeys.userActiveRoom(userId),
    presenceKeys.disconnectDeadlines(),
    userId,
    PRESENCE_PREFIX,
  )) as string[];

  const [status, roomId, previousHostId, hostId] = result;

  if (status !== "left" || !roomId) {
    return { status: "not_in_room" };
  }

  return {
    status: "left",
    roomId,
    hostChange:
      previousHostId !== hostId
        ? {
            roomId,
            previousHostId: previousHostId || null,
            hostId: hostId || null,
          }
        : null,
  };
}
