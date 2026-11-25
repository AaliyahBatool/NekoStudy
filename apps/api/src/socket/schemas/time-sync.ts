import { z } from "zod";

export const timeSyncSchema = z
  .object({
    clientSentAt: z.number().int().nonnegative().safe(),
  })
  .strict();