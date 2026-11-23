import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";

import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import healthRouter from "./routes/health.js";


const app: Express = express();

// 1. Assign a unique ID to every incoming request.
app.use(requestIdMiddleware);

// 2. Log incoming HTTP requests and their responses.
app.use(
  pinoHttp({
    logger,
    customProps: (_req, res) => ({
      requestId: res.locals.requestId,
    }),
  }),
);

// 3. Add security-related HTTP headers.
app.use(helmet());

// 4. Allow requests only from our configured frontend origin.
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

// 5. Parse JSON request bodies, with a size limit.
app.use(express.json({ limit: "100kb" }));

// API routes.
app.use("/api/v1/health", healthRouter);

// Unknown routes become standard 404 errors.
app.use((_req, _res, next) => {
  next(new AppError("NOT_FOUND", 404, "Route not found"));
});

// Error handler must be registered last.
app.use(errorHandler);

export default app;