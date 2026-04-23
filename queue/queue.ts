import { Queue } from "bullmq";
import {connection} from "../config/queueConnection.ts";

const imageProcessingJobQueue = new Queue("image-processing-jobs", { connection });

export default imageProcessingJobQueue;