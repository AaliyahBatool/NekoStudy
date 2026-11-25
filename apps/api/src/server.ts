import { createServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { authenticateSocket } from "./socket/auth-middleware.js";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@nekostudy/shared";

import type { SocketData } from "./types/socket.js";
import { registerTimeSyncHandler } from "./socket/handlers/time-sync.js";
import {
  registerSocket,
  unregisterSocket,
} from "./services/presence/socket-registry.js";

import { registerRoomJoinHandler } from "./socket/handlers/room-join.js";

import {
  startPresenceCleanupWorker,
  stopPresenceCleanupWorker,
} from "./services/presence/cleanup-worker.js";

import { registerRoomLeaveHandler } from "./socket/handlers/room-leave.js";

import { clearStalePresence } from "./services/presence/startup-cleanup.js";

const server = createServer(app);

const io = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  },
});

io.use(authenticateSocket);

// Register Redis presence and join the user's private room before
// Socket.IO accepts the connection.
io.use(async (socket, next) => {
  const userId = socket.data.userId;

  if (!userId) {
    next(new Error("UNAUTHENTICATED"));
    return;
  }

  let registered = false;

  try {
    await registerSocket(userId, socket.id);
    registered = true;

    await socket.join(`user:${userId}`);

    next();
  } catch (error) {
    logger.error(
      { err: error, userId, socketId: socket.id },
      "Socket initialization failed",
    );

    // Roll back Redis registration if private-room joining fails.
    if (registered) {
      try {
        await unregisterSocket(userId, socket.id);
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, userId, socketId: socket.id },
          "Failed to roll back socket registration",
        );
      }
    }

    next(
      error instanceof Error
        ? error
        : new Error("SOCKET_INITIALIZATION_FAILED"),
    );
  }
});

const pendingPresenceCleanup = new Set<Promise<void>>();

io.on("connection", (socket) => {
  const userId = socket.data.userId;

  // Defensive guard: the middleware should guarantee this.
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  // Registration and private-room joining have already completed.
  // Handlers can therefore be registered immediately.
  registerTimeSyncHandler(socket);
  registerRoomJoinHandler(io, socket);
  registerRoomLeaveHandler(io, socket);

  logger.debug(
    { userId, socketId: socket.id },
    "Socket presence registered",
  );

  socket.on("disconnect", (reason) => {
    const cleanup = unregisterSocket(userId, socket.id)
      .then((result) => {
        logger.debug(
          {
            userId,
            socketId: socket.id,
            lastSocket: result.lastSocket,
            reason,
          },
          "Socket presence unregistered",
        );
      });

    pendingPresenceCleanup.add(cleanup);

    void cleanup
      .catch((error: unknown) => {
        logger.error(
          { err: error, userId, socketId: socket.id },
          "Failed to unregister socket presence",
        );
      })
      .finally(() => {
        pendingPresenceCleanup.delete(cleanup);
      });
  });
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  const forceExitTimer = setTimeout(() => {
    logger.fatal("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);

  await stopPresenceCleanupWorker();

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
      await Promise.allSettled([...pendingPresenceCleanup]);

      logger.info("Pending socket presence cleanup completed");
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
      logger.error(
        { err: prismaResult.reason },
        "Failed to disconnect PostgreSQL",
      );
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

    process.exit(process.exitCode ?? 0);
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
    await Promise.all([prisma.$connect(), redis.connect()]);

    logger.info("PostgreSQL and Redis connected");

    // Remove ephemeral presence left by a previous API process.
    // Do this before starting the worker or accepting connections.
    await clearStalePresence();

    startPresenceCleanupWorker(io);

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "NekoStudy API server is running");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect application dependencies");

    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);

    process.exitCode = 1;
  }
}

void startServer();
