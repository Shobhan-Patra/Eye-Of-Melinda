import express from "express";
import type {Request, Response} from "express";
import {errorHandler} from "./middlewares/errorHandler.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthcheck', (req: Request, res: Response) => {
    res.json({
        ping: "pong"
    });
});

import imageHandlerRouter from "./routes/imageHandler.ts";
import statusHandler from "./routes/status.ts";

app.use('/api/v1', imageHandlerRouter);
app.use('/api/v1', statusHandler);

app.use(errorHandler);

export default app;