export class AppError extends Error {
    code;
    httpStatus;
    details;
    constructor(code, httpStatus, message, details) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.details = details;
        this.name = "AppError";
        // Needed for reliable instanceof checks in some transpilation setups.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
//# sourceMappingURL=errors.js.map