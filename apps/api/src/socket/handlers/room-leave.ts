import type { AppSocket, AppSocketServer } from '../../types/socket.js';

import { logger } from '../../lib/logger.js';
import { leaveRoomPresence } from '../../services/presence/room-presence.js';
import { withUserLock } from '../../services/presence/user-lock.js';
import { roomLeaveSchema } from '../schemas/room-leave.js';

export function registerRoomLeaveHandler(io: AppSocketServer, socket: AppSocket): void {
  socket.on('room:leave', (payload, ack) => {
    if (typeof ack !== 'function') return;

    void (async () => {
      const result = roomLeaveSchema.safeParse(payload);

      if (!result.success) {
        ack({
          ok: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid room leave payload',
          },
        });
        return;
      }

      const userId = socket.data.userId;

      if (!userId) {
        ack({
          ok: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
        });
        return;
      }

      try {
        await withUserLock(userId, async () => {
          const result = await leaveRoomPresence(userId);

          if (result.status === 'not_in_room') {
            ack({ ok: true });
            return;
          }

          const userRoom = `user:${userId}`;
          const roomChannel = `room:${result.roomId}`;

          // Notify the remaining members, excluding all of this
          // user's tabs.
          io.to(roomChannel).except(userRoom).emit('presence:left', {
            userId,
          });

          if (result.hostChange) {
            io.to(roomChannel).except(userRoom).emit('host:changed', {
              roomId: result.roomId,
              hostId: result.hostChange.hostId,
            });
          }

          io.to(userRoom).emit('room:left', {
            roomId: result.roomId,
          });

          // Explicit leave is immediate and applies to every tab.
          io.in(userRoom).socketsLeave(roomChannel);

          logger.debug({ userId, roomId: result.roomId }, 'User explicitly left room');

          ack({ ok: true });
        });
      } catch (error) {
        logger.error({ err: error, userId, socketId: socket.id }, 'Room leave failed');

        ack({
          ok: false,
          error: {
            code: 'INTERNAL',
            message: 'An unexpected error occurred',
          },
        });
      }
    })();
  });
}
