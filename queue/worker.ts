import { Worker } from "bullmq";

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    tls: {},
    enableOfflineQueue: false
};

const worker = new Worker("image-processing-jobs", async (job) => {
    //TODO: Actual background job processing
    console.log("Processing job: ", job.name, job.id);
}, { connection });

worker.on("completed", (job) => {
    console.log("Completed: ", job.id);
})

worker.on("failed", (job, err) => {
    console.error("Failed: ", err);
})