import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  CLIENT_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters long"),
  COOKIE_SECRET: z.string().min(32, "must be at least 32 characters long"),
  ASSET_BASE_URL: z.string().url(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("\n❌ Invalid environment configuration:");

  for (const issue of result.error.issues) {
    const variable = issue.path.join(".") || "environment";
    console.error(`  - ${variable}: ${issue.message}`);
  }

  console.error("\nCheck your .env file against .env.example.\n");
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
