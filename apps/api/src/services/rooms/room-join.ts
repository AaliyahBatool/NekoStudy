import type { SocketErrorCode } from "@nekostudy/shared";

import { prisma } from "../../lib/db.js";

export class RoomJoinError extends Error {
  constructor(
    public readonly code: SocketErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RoomJoinError";
  }
}

export interface RoomJoinContext {
  room: {
    id: string;
    name: string;
    ownerId: string;
    sceneId: string;
    maxMembers: number;
    focusMin: number;
    shortBreakMin: number;
    longBreakMin: number;
    cyclesBeforeLong: number;
    createdAt: Date;
    closedAt: Date | null;
  };

  joinedAt: Date;
  displayName: string;
}

export async function getRoomJoinContext(
  roomId: string,
  userId: string,
): Promise<RoomJoinContext> {
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
      createdAt: true,
      closedAt: true,
    },
  });

  if (!room) {
    throw new RoomJoinError("NOT_FOUND", "Room not found");
  }

  const membership = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    select: {
      joinedAt: true,
      bannedAt: true,
    },
  });

  const isOwner = room.ownerId === userId;

  // The owner must always retain access to their own room.
  if (!isOwner && !membership) {
    throw new RoomJoinError("FORBIDDEN", "You are not a member of this room");
  }

  if (!isOwner && membership?.bannedAt) {
    throw new RoomJoinError("BANNED", "You have been banned from this room");
  }

  if (room.closedAt && !isOwner) {
    throw new RoomJoinError("FORBIDDEN", "This room is closed");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  if (!user) {
    throw new RoomJoinError("UNAUTHENTICATED", "User account not found");
  }

  return {
    room,
    joinedAt: membership?.joinedAt ?? room.createdAt,
    displayName: user.displayName,
  };
}
