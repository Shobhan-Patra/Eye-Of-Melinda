import type {NextFunction, Request, Response} from "express";
import {ApiResponse} from "../utils/apiResponse.ts";
import getHash from "../utils/fileHasher.ts";
import {Storage} from '@google-cloud/storage';
import {ApiError} from "../utils/apiError.ts";
import {db} from "../db/db.ts";
import imageProcessingJobQueue from "../queue/queue.ts";
import {uuid as v4} from "uuidv4";
const bucketName = process.env.BUCKET_NAME!;

// Creates a client
const storage = new Storage({
    projectId: process.env.BUCKET_PROJECT_ID!,
    keyFilename: process.env.BUCKET_KEY_FILENAME!,
});

async function getSignedDownloadURL(imageHash: string) {
    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    // Get a v4 signed URL for reading the file
    const url = await storage.bucket(bucketName).file(imageHash).getSignedUrl(options);

    console.log('Generated GET signed URL:');
    console.log(url[0]);

    return url[0];
}

async function uploadFile(fileName: string) {
    const filePath = `uploads/${fileName}`;
    const destinationFileName = await getHash(filePath); // hash the image file to reduce redundant checks later

    const options = {
        destination: destinationFileName!,
    };

    await storage.bucket(bucketName).upload(filePath, options);
    console.log(`${filePath} uploaded to ${bucketName}`);
}

const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file?.filename) {
        throw new ApiError(404, `No file provided`);
    }

    try {
        // update image metadata in DB
        const imageHash = await getHash('uploads/' + req.file.filename) || "";

        const existingImage = await db.execute('SELECT * FROM images WHERE hash_value = ?', [imageHash]);

        if (existingImage.rows.length > 0) {

            if (!existingImage.rows[0]?.caption) {
                return res
                    .status(202)
                    .json(new ApiResponse(202, null, "Image is being processed. Retry later"));
            }

            return res
                .status(200)
                .json(new ApiResponse(200, {caption: existingImage.rows[0]?.caption},
                    "Retrieved from DB (Previously processed image)"
                )
            );
        }

        // upload file to GCS
        await uploadFile(req.file.filename);

        const imageId = v4();
        const imageUrl = await getSignedDownloadURL(imageHash);

        // update DB
        await db.execute(`INSERT INTO images (id, hash_value, url) VALUES (?, ?, ?); `, [imageId, imageHash, imageUrl]);

        await imageProcessingJobQueue.add(imageHash, {
            image: req.file,
        });
        console.log(`${imageHash} (${req.file.filename}) is sent to processing queue`);

        return res.status(200).json(new ApiResponse(200, imageHash, "Image is being processed"));
    } catch (error) {
        console.log(error);
        next(error);
    }
}

export {uploadImage};