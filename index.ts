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

app.use(errorHandler);

export default app;