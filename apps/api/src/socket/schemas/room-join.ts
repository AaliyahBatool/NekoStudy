import { z } from 'zod';

export const roomJoinSchema = z
  .object({
    roomId: z.string().uuid(),
  })
  .strict();
