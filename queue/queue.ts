import { Queue } from "bullmq";
import {connection} from "../config/queueConnection.js";

const imageProcessingJobQueue = new Queue("image-processing-jobs", { connection });

export default imageProcessingJobQueue;