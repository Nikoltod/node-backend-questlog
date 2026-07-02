export class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode: number
    ) {
        super(message);
    }
};

export class NotFoundError extends AppError {
    constructor(message: string) {
        super('NOT_FOUND', message, 404);
    }
};