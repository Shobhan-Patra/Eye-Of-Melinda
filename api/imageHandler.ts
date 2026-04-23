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
    // console.log(`${filePath} uploaded to ${bucketName}`);
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
        await uploadFile(file.filename); // upload file to GCS

        const newImage = {
            id: v4(),
            name: file.filename,
            hash_value: imageHash,
            url: await getSignedDownloadURL(imageHash, path.extname(file.filename))
        }

        fs.unlinkSync(localImagePath); // delete local image

        // update DB
        await db.execute(`INSERT INTO images (id, hash_value, url) VALUES (?, ?, ?); `, [newImage.id, newImage.hash_value, newImage.url]);

        // add new job to processing queue
        const job = await imageProcessingJobQueue.add("captioning", {
            newImage
        },
            { jobId: newImage.hash_value } // To prevent duplicate jobs
        );
        // console.log(`${newImage.hash_value} (${file.filename}) is sent to processing queue`);

        return res.status(202).json(new ApiResponse(200, {
            image: newImage,
            jobId: job.id
        }, "Image sent to processing queue"));

    } catch (error) {
        console.error(error);
        next(error);
    }
}

export {uploadImage};