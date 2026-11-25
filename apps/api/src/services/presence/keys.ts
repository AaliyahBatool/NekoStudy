
export const PRESENCE_PREFIX = "nekostudy";

export const presenceKeys = {
  roomUsers(roomId: string): string {
    return `${PRESENCE_PREFIX}:room:${roomId}:users`;
  },

  roomStatuses(roomId: string): string {
    return `${PRESENCE_PREFIX}:room:${roomId}:statuses`;
  },

  roomAgendaVersion(roomId: string): string {
    return `${PRESENCE_PREFIX}:room:${roomId}:agenda-version`;
  },

  roomChat(roomId: string): string {
    return `${PRESENCE_PREFIX}:room:${roomId}:chat`;
  },

  userSockets(userId: string): string {
    return `${PRESENCE_PREFIX}:user:${userId}:sockets`;
  },

  userActiveRoom(userId: string): string {
    return `${PRESENCE_PREFIX}:user:${userId}:active-room`;
  },

  disconnectDeadlines(): string {
    return `${PRESENCE_PREFIX}:presence:disconnect-deadlines`;
  },

  roomOwner(roomId: string): string {
  return `${PRESENCE_PREFIX}:room:${roomId}:owner`;
},
};
