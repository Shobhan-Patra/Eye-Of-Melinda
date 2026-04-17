import type {Request, Response, NextFunction} from 'express';
import upload from "../config/multer.ts";
import {ApiError} from "../utils/apiError.ts";
import multer from "multer";

export function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
    upload(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            return next(new ApiError(400, `Upload failed: ${err.message}`));
        }
        else if (err) {
            return next(err instanceof ApiError ? err : new ApiError(500, err.message));
        }

        if (!req.file) {
            return next(new ApiError(400, 'Please upload an image file'));
        }

        next();
    })
}