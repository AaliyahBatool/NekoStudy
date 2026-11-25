import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@nekostudy/shared";

export interface SocketData {
  userId?: string;
}

export type AppSocket = import("socket.io").Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type AppSocketServer = import("socket.io").Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;