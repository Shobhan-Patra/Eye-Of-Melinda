import type {NextFunction, Request, Response} from "express";
import {ApiResponse} from "../utils/apiResponse.ts";
import getHash from "../utils/fileHasher.ts";
import {Storage} from '@google-cloud/storage';
import {ApiError} from "../utils/apiError.ts";
import {db} from "../db/db.ts";
import imageProcessingJobQueue from "../queue/queue.ts";
import {uuid as v4} from "uuidv4";
import path from "path";
import * as fs from "node:fs";
const bucketName = process.env.BUCKET_NAME!;

// Creates a client
const storage = new Storage({
    projectId: process.env.BUCKET_PROJECT_ID!,
    keyFilename: process.env.BUCKET_KEY_FILENAME!,
});

async function getSignedDownloadURL(imageHash: string, fileExt: string) {
    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 30 * 60 * 1000, // 30 minutes
    };

    // Get a v4 signed URL for reading the file
    const fileName = imageHash + fileExt;
    const url = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);

    return url[0];
}

async function uploadFile(fileName: string) {
    const filePath = `uploads/${fileName}`;
    const destinationFileName = await getHash(filePath) + path.extname(filePath); // hash the image file to reduce redundant checks later

    const options = {
        destination: destinationFileName!,
    };

    await storage.bucket(bucketName).upload(filePath, options);
    console.log(`${filePath} uploaded to ${bucketName}`);
}

const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    if (!file?.filename) {
        return next(new ApiError(400, "No file provided"));
    }

    try {
        // Compute image hash
        const localImagePath = path.join('uploads', file.filename);
        const imageHash = await getHash(localImagePath) || "";
        const extName = path.extname(file.filename);

        const { rows } = await db.execute('SELECT id, caption FROM images WHERE hash_value = ?', [imageHash]);
        const existingImage = rows[0];

        // Image already processed
        if (existingImage?.caption) {
            return res.status(200)
                .json(new ApiResponse(200, {
                        caption: existingImage.caption
                        },
                    "Retrieved from DB (Previously processed image)"
                    )
                );
        }

        // Image is being processed
        const existingJob = await imageProcessingJobQueue.getJob(imageHash);
        if (existingImage || existingJob) {
            return res.status(202).json(
                new ApiResponse(202, { imageHash: imageHash, jobId: imageHash }, "Image is already in the processing queue")
            );
        }

        // New Image
        await uploadFile(req.file.filename); // upload file to GCS

        const imageId = v4();
        const imageUrl = await getSignedDownloadURL(imageHash, path.extname(file.filename));

        // update DB
        await db.execute(`INSERT INTO images (id, hash_value, url) VALUES (?, ?, ?); `, [imageId, imageHash, imageUrl]);

        const job = await imageProcessingJobQueue.add("captioning",
            { image: file, imageUrl, imageHash },
            { jobId: imageHash } // To prevent duplicate jobs
        );
        console.log(`${imageHash} (${file.filename}) is sent to processing queue`);

        fs.unlinkSync(localImagePath); // delete local image

        return res.status(202).json(new ApiResponse(200, {
            imageHash: imageHash,
            jobId: job.id
        }, "Image sent to processing queue"));

    } catch (error) {
        console.log(error);
        next(error);
    }
}

export {uploadImage};