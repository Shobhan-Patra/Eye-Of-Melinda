import {Router} from "express";
import {uploadImage} from "../api/imageHandler.ts";
import {uploadMiddleware} from "../middlewares/multer.ts";

const router = Router();

router.post('/upload', uploadMiddleware, uploadImage);

export default router;