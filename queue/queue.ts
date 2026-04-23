import { Queue } from "bullmq";
import {connection} from "../config/queueConnection.ts";

const imageProcessingJobQueue = new Queue("image-processing-jobs",
    {
        connection,
        limiter: {
            max: 10,
            duration: 1000
        }
    }
);

export default imageProcessingJobQueue;