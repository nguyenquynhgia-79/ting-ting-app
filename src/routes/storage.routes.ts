import { Router } from "express";
import { uploadFile } from "../controllers/storage.controller";

const router = Router();

// Unified direct upload (multipart/form-data)
router.post("/upload", uploadFile);

export default router;
