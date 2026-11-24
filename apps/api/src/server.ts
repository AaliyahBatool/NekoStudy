import { createServer } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/redis.js";

const server = createServer(app);

async function startServer() {
  try {
    // Establish database and Redis connections before accepting requests.
    await Promise.all([
      prisma.$connect(),
      redis.connect(),
    ]);

    logger.info("PostgreSQL and Redis connected");

    server.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT },
        "NekoStudy API server is running",
      );
    });
  } catch (error) {
    logger.fatal(
      { err: error },
      "Failed to connect application dependencies",
    );

    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);

    process.exit(1);
  }
}

server.on("error", (error) => {
  logger.fatal({ err: error }, "Failed to start API server");
  process.exit(1);
});

void startServer();