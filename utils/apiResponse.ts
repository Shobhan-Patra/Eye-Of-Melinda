export class ApiResponse<T> {
    public readonly success: true = true;
    public readonly statusCode: number;
    public readonly message?: string;
    public readonly data?: T;
    public readonly meta?: Record<string, unknown>;

    constructor(
        statusCode: number,
        data?: T,
        message?: string,
        meta?: Record<string, unknown>
    ) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.meta = meta;
    }
}
