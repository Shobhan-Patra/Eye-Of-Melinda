import multer from "multer";
import type {Request} from "express";
import path from "path";
import {ApiError} from "../utils/apiError.ts";

const storage = multer.diskStorage({
    destination: function (req: Request, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req: Request, file, cb) {
        cb(null,  file.originalname);
    }
});

// Max upload size - 10MB
const maxSize = 10 * 1000 * 1000;

// Configure Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }

        throw new ApiError(400, "Only image types under 10MB are allowed!");
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
}).single("myImage");

export default upload;