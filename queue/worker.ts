import { Worker } from "bullmq";
import axios from "axios";
import {connection} from "../config/queueConnection.ts";
import {db} from "../db/db.ts";

const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL!;

// Capitalization helper function
const capitalize = <Input extends string>(string: Input): Capitalize<Input> =>
    (string.charAt(0).toUpperCase() + string.slice(1)) as Capitalize<Input>;

const worker = new Worker("image-processing-jobs", async (job) => {
    console.log("Processing job: ", job.name, job.id);

    const { newImage } = job.data;

    try {
        const response = await axios.post(MODEL_SERVICE_URL,
            {
                image_url: newImage.url
            },
            {
                timeout: 30000 // 30s timeout for ML model
            }
        );

        const CapitalizedCaption = capitalize(response.data?.caption);

        await db.execute('UPDATE images SET caption = (?) WHERE hash_value = (?);', [CapitalizedCaption, newImage.hash_value]);

        // console.log(CapitalizedCaption);
        return CapitalizedCaption;
    } catch (error: any) {
        if (error.response) {
            console.error("FastAPI Error:", JSON.stringify(error.response.data.detail));
        } else {
            console.error("Worker Error:", error.message);
        }
        throw error; // Re-throw so BullMQ knows the job failed
    }


}, { connection, concurrency: 5 });

// worker.on("completed", (job) => {
//     console.log("Completed: ", job.id);
// })
//
// worker.on("failed", (job, err) => {
//     console.error("Failed: ", err.message);
// })