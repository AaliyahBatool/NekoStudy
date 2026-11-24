import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times: number) {
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (error: Error) => {
  console.error("Redis connection error:", error.message);
});