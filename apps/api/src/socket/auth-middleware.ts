import * as cookie from "cookie";
import type { AppSocket } from "../types/socket.js";

import { ACCESS_TOKEN_COOKIE_NAME } from "../constants/auth.js";
import { verifyToken } from "../lib/auth.js";

export async function authenticateSocket(
  socket: AppSocket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    // Read the HTTP Cookie header sent during the Socket.IO handshake.
    const cookies = cookie.parseCookie(socket.handshake.headers.cookie ?? "");

    // Extract the HTTP-only access token.
    const token = cookies[ACCESS_TOKEN_COOKIE_NAME];

    if (!token) {
      next(new Error("UNAUTHENTICATED"));
      return;
    }

    // Verify the token using the same authentication logic as REST.
    const payload = await verifyToken(token);

    if (!payload) {
      next(new Error("UNAUTHENTICATED"));
      return;
    }

    // Store the authenticated user ID for subsequent socket handlers.
    socket.data.userId = payload.userId;

    next();
  } catch {
    next(new Error("UNAUTHENTICATED"));
  }
}
