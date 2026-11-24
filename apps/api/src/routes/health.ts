
import { Router, type Router as RouterType } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const router: RouterType = Router();

// Liveness check: confirms the API process is responding.
router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Readiness check: confirms PostgreSQL is reachable.
router.get("/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (err) {
    logger.error({ err }, "DB health check failed");

    res.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

export default router;
