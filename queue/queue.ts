import { Queue } from "bullmq";

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    tls: {},
    enableOfflineQueue: false
};

const imageProcessingJobQueue = new Queue("image-processing-jobs", { connection });

// async function addJobs() {
//     await imageProcessingJobQueue.add('Image1', {name: "Image1"})
//     await imageProcessingJobQueue.add('Image2', {name: "Image2"})
// }
//
// await addJobs();

export default imageProcessingJobQueue;