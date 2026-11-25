import type { AppSocket, AppSocketServer } from "../../types/socket.js";

import { logger } from "../../lib/logger.js";
import { getRoomSnapshot } from "../../services/rooms/room-snapshot.js";
import {
  getRoomJoinContext,
  RoomJoinError,
} from "../../services/rooms/room-join.js";
import { joinRoomPresence } from "../../services/presence/room-presence.js";
import { roomJoinSchema } from "../schemas/room-join.js";
import { withUserLock } from "../../services/presence/user-lock.js";

export function registerRoomJoinHandler(
  io: AppSocketServer,
  socket: AppSocket,
): void {
  socket.on("room:join", (payload, ack) => {
    if (typeof ack !== "function") return;

    void (async () => {
      const result = roomJoinSchema.safeParse(payload);

      if (!result.success) {
        ack({
          ok: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: "Invalid room join payload",
          },
        });
        return;
      }

      const userId = socket.data.userId;

      if (!userId) {
        ack({
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        });
        return;
      }

      try {
        await withUserLock(userId, async () => {
          // 1. Verify room access and load persisted room settings.
          const context = await getRoomJoinContext(result.data.roomId, userId);

          // 2. Update Redis presence atomically.
          const presence = await joinRoomPresence({
            roomId: context.room.id,
            userId,
            ownerId: context.room.ownerId,
            joinedAt: context.joinedAt,
            maxMembers: context.room.maxMembers,
          });

          if (presence.status === "room_full") {
            ack({
              ok: false,
              error: {
                code: "ROOM_FULL",
                message: "This room has reached its member limit",
              },
            });
            return;
          }

          if (presence.status === "not_connected") {
            ack({
              ok: false,
              error: {
                code: "UNAUTHENTICATED",
                message: "Socket presence is not registered",
              },
            });
            return;
          }

          const userRoom = `user:${userId}`;
          const targetRoom = `room:${context.room.id}`;

          // 3. Move every tab belonging to this user when necessary.
          if (presence.status === "joined" && presence.previousRoomId) {
            await io
              .in(userRoom)
              .socketsLeave(`room:${presence.previousRoomId}`);
          }

          // Also handles a newly connected tab joining an existing room.
          await io.in(userRoom).socketsJoin(targetRoom);

          // 4. Notify the previous room when this user moved.
          if (presence.status === "joined" && presence.previousRoomId) {
            io.to(`room:${presence.previousRoomId}`).emit("presence:left", {
              userId,
            });
            // Broadcast only actual host transitions.
            for (const change of presence.hostChanges) {
              io.to(`room:${change.roomId}`).emit("host:changed", {
                roomId: change.roomId,
                hostId: change.hostId,
              });
            }
          }

          // 5. Notify the target room only for a genuine new presence entry.
          // A second tab must not produce another presence:joined event.
          if (presence.status === "joined") {
            io.to(targetRoom).except(userRoom).emit("presence:joined", {
              userId,
              displayName: context.displayName,
              status: "focusing",
              joinedAt: context.joinedAt.toISOString(),
            });
            // Broadcast only actual host transitions.
            for (const change of presence.hostChanges) {
              io.to(`room:${change.roomId}`).emit("host:changed", {
                roomId: change.roomId,
                hostId: change.hostId,
              });
            }
          }

          // 6. Build the authoritative room state.
          const snapshot = await getRoomSnapshot(context.room.id);

          // 7. Update all tabs belonging to this user.
          io.to(userRoom).emit("room:snapshot", snapshot);

          // 8. Return the snapshot to the requesting tab.
          ack({
            ok: true,
            snapshot,
          });
        });
      } catch (error) {
        if (error instanceof RoomJoinError) {
          ack({
            ok: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        logger.error(
          { err: error, userId, socketId: socket.id },
          "Room join failed",
        );

        ack({
          ok: false,
          error: {
            code: "INTERNAL",
            message: "An unexpected error occurred",
          },
        });
      }
    })();
  });
}
