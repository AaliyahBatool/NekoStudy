
import { createServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { authenticateSocket } from "./socket/auth-middleware.js";

const server = createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  },
});

io.use(authenticateSocket);

let isShuttingDown = false;


async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  const forceExitTimer = setTimeout(() => {
    logger.fatal("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);

  try {
    // First close Socket.IO and the HTTP server.
    try {
      await new Promise<void>((resolve, reject) => {
        io.close((error?: Error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      logger.info("Socket.IO and HTTP server closed");
    } catch (error) {
      logger.error({ err: error }, "Failed to close HTTP server");
      process.exitCode = 1;
    }

    // Only then disconnect application dependencies.
    const results = await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);

    const [prismaResult, redisResult] = results;

    if (prismaResult.status === "fulfilled") {
      logger.info("PostgreSQL connection closed");
    } else {
      logger.error({ err: prismaResult.reason }, "Failed to disconnect PostgreSQL");
      process.exitCode = 1;
    }

    if (redisResult.status === "fulfilled") {
      logger.info("Redis connection closed");
    } else {
      logger.error({ err: redisResult.reason }, "Failed to disconnect Redis");
      process.exitCode = 1;
    }
  } finally {
    clearTimeout(forceExitTimer);
    logger.info("Shutdown complete");
  }
}


// Handle terminal shutdown and deployment termination signals.
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

server.on("error", (error) => {
  logger.fatal({ err: error }, "Failed to start API server");
  void shutdown("SERVER_ERROR");
});

async function startServer(): Promise<void> {
  try {
    // Connect dependencies before accepting requests.
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

    process.exitCode = 1;
  }
}

void startServer();
