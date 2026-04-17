import type { Request, Response, NextFunction } from "express";
import {ApiError} from "../utils/apiError.ts";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors ?? null
        });
    }

    console.log("Unhandled errors: ", err);

    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Internal Server Error",
    });
}