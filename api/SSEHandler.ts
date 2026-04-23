import {QueueEvents} from "bullmq";
import type {NextFunction, Response, Request} from "express";
import {connection} from "../config/queueConnection.ts";

const queueEvents = new QueueEvents("image-processing-jobs", {connection});

// Handles Server Sent Events
const SSEHandler = async function (req: Request, res: Response, next: NextFunction) {
    const { jobId } = req.params;

    // Standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendUpdate = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Listen for BullMQ completion
    const onCompleted = ({ jobId: id, returnvalue }: { jobId: string, returnvalue: any }) => {
        if (id === jobId) {
            sendUpdate({ status: "completed", result: returnvalue });
            cleanup();
        }
    };

    const onFailed = ({ jobId: id, failedReason }: { jobId: string, failedReason: string }) => {
        if (id === jobId) {
            sendUpdate({ status: "failed", error: failedReason });
            cleanup();
        }
    };

    const cleanup = () => {
        queueEvents.off("completed", onCompleted);
        queueEvents.off("failed", onFailed);
        res.end();
    }

    queueEvents.on('completed', onCompleted);
    queueEvents.on('failed', onFailed);

    // Clean up if user closes tab
    req.on("close", cleanup)
}

export {SSEHandler};