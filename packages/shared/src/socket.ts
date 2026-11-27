export type SocketErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ROOM_FULL'
  | 'BANNED'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface SocketError {
  code: SocketErrorCode;
  message: string;
}

export type SocketAck<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: SocketError };
// -----------------------------------------------
// TIME SYNCHRONIZATION
// -----------------------------------------------

export interface TimeSyncPayload {
  /** Client's Unix timestamp in milliseconds. */
  clientSentAt: number;
}

export interface TimeSyncResponse {
  clientSentAt: number;
  /** Server's UTC timestamp in ISO 8601 format. */
  serverTime: string;
}

// -----------------------------------------------
// ROOM SNAPSHOT
// -----------------------------------------------

export type MemberStatus = 'focusing' | 'break' | 'away';

export type TimerMode = 'idle' | 'focus' | 'short_break' | 'long_break';

export interface RoomSnapshot {
  room: {
    id: string;
    name: string;
    ownerId: string;
    sceneId: string;
    maxMembers: number;
  };

  members: Array<{
    userId: string;
    displayName: string;
    status: MemberStatus;
    joinedAt: string;
  }>;

  hostId: string | null;

  timer: {
    mode: TimerMode;
    startedAt: string | null;
    durationMs: number | null;
    pausedAt: string | null;
    accumulatedMs: number;
    cycleCount: number;
    version: number;
    settings: {
      focusMin: number;
      shortBreakMin: number;
      longBreakMin: number;
      cyclesBeforeLong: number;
    };
  };

  agenda: {
    items: Array<{
      id: string;
      text: string;
      position: number;
      done: boolean;
      createdAt: string;
    }>;
    version: number;
  };

  chat: Array<{
    id: string;
    userId: string;
    displayName: string;
    text: string;
    createdAt: string;
  }>;

  serverTime: string;
}

// -----------------------------------------------
// ROOM JOIN
// -----------------------------------------------

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomJoinResponse {
  snapshot: RoomSnapshot;
}

export interface PresenceJoinedPayload {
  userId: string;
  displayName: string;
  status: MemberStatus;
  joinedAt: string;
}

export interface PresenceLeftPayload {
  userId: string;
}

// -----------------------------------------------
// CLIENT -> SERVER EVENTS
// -----------------------------------------------

export interface ClientToServerEvents {
  'time:sync': (
    payload: TimeSyncPayload,
    ack: (response: SocketAck<TimeSyncResponse>) => void,
  ) => void;

  'room:join': (
    payload: RoomJoinPayload,
    ack: (response: SocketAck<RoomJoinResponse>) => void,
  ) => void;

  'room:leave': (payload: RoomLeavePayload, ack: (response: SocketAck) => void) => void;
}

// -----------------------------------------------
// SERVER -> CLIENT EVENTS
// -----------------------------------------------

export interface ServerToClientEvents {
  error: (payload: { code: SocketErrorCode; message: string; event?: string }) => void;

  'room:snapshot': (snapshot: RoomSnapshot) => void;

  'presence:joined': (payload: PresenceJoinedPayload) => void;
  'presence:left': (payload: PresenceLeftPayload) => void;
  'host:changed': (payload: { roomId: string; hostId: string | null }) => void;
  'room:left': (payload: { roomId: string }) => void;
}

// Socket.IO uses this empty event map because we define no inter-server events.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

export type RoomLeavePayload = Record<string, never>;
