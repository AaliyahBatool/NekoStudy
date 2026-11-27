export type ErrorCode =
  'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';

    // Needed for reliable instanceof checks in some transpilation setups.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
