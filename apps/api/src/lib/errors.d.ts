export type ErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT" | "INTERNAL";
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown | undefined;
    constructor(code: ErrorCode, httpStatus: number, message: string, details?: unknown | undefined);
}
//# sourceMappingURL=errors.d.ts.map