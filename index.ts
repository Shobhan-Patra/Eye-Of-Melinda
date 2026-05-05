import express from "express";
import cors from "cors";
import type {Request, Response} from "express";
import {errorHandler} from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.FRONTEND_URL!,
}));

app.get('/healthcheck', (req: Request, res: Response) => {
    res.json({
        ping: "pong"
    });
});

import imageHandlerRouter from "./routes/imageHandler.js";
import statusHandler from "./routes/status.js";

app.use('/api/v1', imageHandlerRouter);
app.use('/api/v1', statusHandler);

app.use(errorHandler);

export default app;