import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
export const errorHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
        res.status(error.httpStatus).json({
            error: {
                code: error.code,
                message: error.message,
                ...(error.details !== undefined && {
                    details: error.details,
                }),
            },
        });
        return;
    }
    if (error instanceof ZodError) {
        res.status(422).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
                details: error.issues,
            },
        });
        return;
    }
    // Log the full error on the server, never return it to the client.
    logger.error({ err: error }, "Unhandled application error");
    res.status(500).json({
        error: {
            code: "INTERNAL",
            message: "An unexpected error occurred",
        },
    });
};
//# sourceMappingURL=error-handler.js.map