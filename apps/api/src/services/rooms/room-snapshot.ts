
import type {
  MemberStatus,
  RoomSnapshot,
  TimerMode,
} from "@nekostudy/shared";

import { prisma } from "../../lib/db.js";
import { redis } from "../../lib/redis.js";
import { presenceKeys } from "../presence/keys.js";

const VALID_STATUSES = new Set<MemberStatus>([
  "focusing",
  "break",
  "away",
]);

const VALID_TIMER_MODES = new Set<TimerMode>([
  "idle",
  "focus",
  "short_break",
  "long_break",
]);

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

function parseChatMessage(value: string): ChatMessage | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("id" in parsed) ||
      !("userId" in parsed) ||
      !("displayName" in parsed) ||
      !("text" in parsed) ||
      !("createdAt" in parsed)
    ) {
      return null;
    }

    const message = parsed as Record<string, unknown>;

    if (
      typeof message.id !== "string" ||
      typeof message.userId !== "string" ||
      typeof message.displayName !== "string" ||
      typeof message.text !== "string" ||
      typeof message.createdAt !== "string"
    ) {
      return null;
    }

    return {
      id: message.id,
      userId: message.userId,
      displayName: message.displayName,
      text: message.text,
      createdAt: message.createdAt,
    };
  } catch {
    return null;
  }
}

export async function getRoomSnapshot(
  roomId: string,
): Promise<RoomSnapshot> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      sceneId: true,
      maxMembers: true,

      focusMin: true,
      shortBreakMin: true,
      longBreakMin: true,
      cyclesBeforeLong: true,

      timer: {
        select: {
          mode: true,
          startedAt: true,
          durationMs: true,
          pausedAt: true,
          accumulatedMs: true,
          cycleCount: true,
          version: true,
        },
      },

      agendaItems: {
        orderBy: [
          { position: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          id: true,
          text: true,
          position: true,
          done: true,
          createdAt: true,
        },
      },
    },
  });

  if (!room) {
    throw new Error("Room disappeared while building snapshot");
  }

  const [
    presenceEntries,
    statuses,
    agendaVersionValue,
    chatEntries,
  ] = await Promise.all([
    redis.zrange(
      presenceKeys.roomUsers(roomId),
      0,
      -1,
      "WITHSCORES",
    ),
    redis.hgetall(presenceKeys.roomStatuses(roomId)),
    redis.get(presenceKeys.roomAgendaVersion(roomId)),
    redis.lrange(presenceKeys.roomChat(roomId), -50, -1),
  ]);

  if (presenceEntries.length % 2 !== 0) {
    throw new Error("Invalid room presence sorted-set data");
  }

  const presentUsers = [];

  for (let index = 0; index < presenceEntries.length; index += 2) {
    const userId = presenceEntries[index];
    const joinedAtMs = Number(presenceEntries[index + 1]);

    if (!userId || !Number.isFinite(joinedAtMs)) {
      throw new Error("Invalid room presence entry");
    }

    presentUsers.push({ userId, joinedAtMs });
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: presentUsers.map((member) => member.userId),
      },
    },
    select: {
      id: true,
      displayName: true,
    },
  });

  const displayNames = new Map(
    users.map((user) => [user.id, user.displayName]),
  );

  // Preserve Redis sorted-set order: earliest join first.
  // Ignore stale presence entries for deleted users.
  const members: RoomSnapshot["members"] = presentUsers
    .filter((member) => displayNames.has(member.userId))
    .map((member) => {
      const storedStatus = statuses[member.userId];

      const status: MemberStatus = VALID_STATUSES.has(
        storedStatus as MemberStatus,
      )
        ? (storedStatus as MemberStatus)
        : "focusing";

      return {
        userId: member.userId,
        displayName: displayNames.get(member.userId)!,
        status,
        joinedAt: new Date(member.joinedAtMs).toISOString(),
      };
    });

  // The owner is always host while present.
  // Otherwise, the earliest-joined present member is host.
  const hostId =
    members.find((member) => member.userId === room.ownerId)?.userId ??
    members[0]?.userId ??
    null;

  const timerMode = room.timer?.mode ?? "idle";

  if (!VALID_TIMER_MODES.has(timerMode as TimerMode)) {
    throw new Error(`Invalid persisted timer mode: ${timerMode}`);
  }

  const timer: RoomSnapshot["timer"] = {
    mode: timerMode as TimerMode,
    startedAt: room.timer?.startedAt?.toISOString() ?? null,
    durationMs: room.timer?.durationMs ?? null,
    pausedAt: room.timer?.pausedAt?.toISOString() ?? null,
    accumulatedMs: room.timer?.accumulatedMs ?? 0,
    cycleCount: room.timer?.cycleCount ?? 0,
    version: room.timer?.version ?? 0,
    settings: {
      focusMin: room.focusMin,
      shortBreakMin: room.shortBreakMin,
      longBreakMin: room.longBreakMin,
      cyclesBeforeLong: room.cyclesBeforeLong,
    },
  };

  const agendaVersion = Number(agendaVersionValue ?? "0");

  if (!Number.isSafeInteger(agendaVersion) || agendaVersion < 0) {
    throw new Error("Invalid room agenda version");
  }

  const chat: ChatMessage[] = chatEntries
    .map(parseChatMessage)
    .filter((message): message is ChatMessage => message !== null);

  return {
    room: {
      id: room.id,
      name: room.name,
      ownerId: room.ownerId,
      sceneId: room.sceneId,
      maxMembers: room.maxMembers,
    },

    members,
    hostId,
    timer,

    agenda: {
      items: room.agendaItems.map((item) => ({
        id: item.id,
        text: item.text,
        position: item.position,
        done: item.done,
        createdAt: item.createdAt.toISOString(),
      })),
      version: agendaVersion,
    },

    chat,
    serverTime: new Date().toISOString(),
  };
}
