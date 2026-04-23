import {Router} from "express";
import {SSEHandler} from "../api/SSEHandler.ts";

const router = Router();

router.get('/status/:jobId', SSEHandler);

export default router;