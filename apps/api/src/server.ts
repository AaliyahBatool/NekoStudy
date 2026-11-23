import { createServer } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT },
    "NekoStudy API server is running",
  );
});

server.on("error", (error) => {
  logger.fatal({ err: error }, "Failed to start API server");
  process.exit(1);
});