import type {NextFunction, Request, Response} from "express";
import {ApiResponse} from "../utils/apiResponse.ts";
import getHash from "../utils/fileHasher.ts";
import {Storage} from '@google-cloud/storage';
import {ApiError} from "../utils/apiError.ts";

// const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024;

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
    const destinationFileName = await getHash(filePath);

    const options = {
        destination: destinationFileName!,
    };

    await storage.bucket(bucketName).upload(filePath, options);
    console.log(`${filePath} uploaded to ${bucketName}`);
}

// uploadFile().catch(console.error);

const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file?.filename) {
        throw new ApiError(404, `No file provided`);
    }

    try {
        await uploadFile(req.file.filename);

        return res.status(200).json(new ApiResponse(200,
            {
                "filename": req.file?.filename
            },
            "Image uploaded successfully")
        );
    } catch (error) {
        console.log(error);
        next(error);
    }
}

export {uploadImage};