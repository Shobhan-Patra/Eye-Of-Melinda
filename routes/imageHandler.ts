import {Router} from "express";
import {uploadImage} from "../api/imageHandler.js";
import {uploadMiddleware} from "../middlewares/multer.js";

const router = Router();

router.post('/upload', uploadMiddleware, uploadImage);

export default router;