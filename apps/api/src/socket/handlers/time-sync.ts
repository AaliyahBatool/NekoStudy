import type { AppSocket } from '../../types/socket.js';
import { timeSyncSchema } from '../schemas/time-sync.js';

export function registerTimeSyncHandler(socket: AppSocket): void {
  socket.on('time:sync', (payload, ack) => {
    if (typeof ack !== 'function') {
      return;
    }

    const result = timeSyncSchema.safeParse(payload);

    if (!result.success) {
      ack({
        ok: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Invalid time synchronization payload',
        },
      });
      return;
    }

    ack({
      ok: true,
      clientSentAt: result.data.clientSentAt,
      serverTime: new Date().toISOString(),
    });
  });
}
