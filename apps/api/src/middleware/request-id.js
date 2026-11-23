import { randomUUID } from "node:crypto";
export const requestIdMiddleware = (_req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
};
//# sourceMappingURL=request-id.js.map