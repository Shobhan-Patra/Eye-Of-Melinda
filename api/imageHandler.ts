import type {NextFunction, Request, Response} from "express";
import {ApiResponse} from "../utils/apiResponse.js";
import getHash from "../utils/fileHasher.js";
import {Storage} from '@google-cloud/storage';
import {ApiError} from "../utils/apiError.js";
import {db} from "../db/db.js";
import imageProcessingJobQueue from "../queue/queue.js";
import {v4 as uuidv4} from "uuid";
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
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 30 * 60 * 1000, // 30 minutes
    };

    // Get a v4 signed URL for reading the file
    const fileName = imageHash + fileExt;
    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);

    return url;
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
        if (existingJob) {
            const state = await existingJob.getState();
            // If job is active or waiting, just tell the user to wait
            if (['active', 'waiting', 'delayed'].includes(state)) {
                return res.status(202).json(new ApiResponse(202, { jobId: imageHash }, "Still processing..."));
            }

            if (state === 'failed') {
                await existingJob.remove();
            }
        }

        // New Image
        await uploadFile(file.filename); // upload file to GCS

        const newImage = {
            id: uuidv4(),
            name: file.filename,
            hash_value: imageHash,
            url: await getSignedDownloadURL(imageHash, path.extname(file.filename))
        }

        fs.unlinkSync(localImagePath); // delete local image

        // update DB
        await db.execute(`INSERT INTO images (id, hash_value, url) VALUES (?, ?, ?); `, [newImage.id, newImage.hash_value, newImage.url]);

        // add new job to processing queue
        const job = await imageProcessingJobQueue.add("captioning",
        {
            newImage
        },
        {
            jobId: newImage.hash_value, // To prevent duplicate jobs
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000
            }
        }
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