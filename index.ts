import express from "express";
import type {Request, Response} from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthcheck', (req: Request, res: Response) => {
    res.json({
        ping: "pong"
    });
});

export default app;