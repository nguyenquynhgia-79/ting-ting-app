import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storageService, upload, UploadType, MAX_FILE_SIZE_BYTES } from "../services/storage.service";
import { asyncHandler } from "../middleware/error-handler";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /storage/upload
 * multipart/form-data: file + { type, userId?, groupId?, expenseId? }
 *
 * Restrictions enforced at two layers:
 *   1. multer fileFilter  → MIME type (jpeg, png, webp only)
 *   2. multer limits      → fileSize ≤ 5 MB
 *   3. controller guard   → double-check size & MIME after parse
 */

// ── Multer error handler middleware ───────────────────────────────────────────
function multerErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
      });
      return;
    }
    res.status(400).json({ message: `Upload error: ${err.message}` });
    return;
  }
  // fileFilter rejection comes as a plain Error
  if (err instanceof Error && err.message.includes("JPEG")) {
    res.status(415).json({
      message: err.message,
      allowedTypes: ALLOWED_TYPES,
    });
    return;
  }
  next(err);
}

// ── Main handler ──────────────────────────────────────────────────────────────
const handleUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "No file provided" });
    return;
  }

  // Double-check MIME (in case Content-Type was spoofed before reaching fileFilter)
  if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
    res.status(415).json({
      message: "Only JPEG, PNG and WebP images are allowed",
      allowedTypes: ALLOWED_TYPES,
    });
    return;
  }

  // Validate magic bytes using file-type
  const { fileTypeFromBuffer } = await import("file-type");
  const fileType = await fileTypeFromBuffer(req.file.buffer);
  
  if (!fileType || !ALLOWED_TYPES.includes(fileType.mime)) {
    res.status(415).json({
      message: "Invalid file content. The file does not match its extension or is corrupted.",
      allowedTypes: ALLOWED_TYPES,
    });
    return;
  }

  // Double-check size (belt-and-suspenders)
  if (req.file.size > MAX_FILE_SIZE_BYTES) {
    res.status(413).json({
      message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
    });
    return;
  }

  const { type, userId, groupId, expenseId } = req.body;

  if (!type) {
    res.status(400).json({
      message: "type is required",
      allowedTypes: ["avatar", "group_cover", "expense_proof"],
    });
    return;
  }

  const result = await storageService.saveFile(
    type as UploadType,
    req.file.buffer,
    req.file.mimetype,
    { userId, groupId, expenseId, originalName: req.file.originalname }
  );

  // Inform client of limits via response headers
  res.setHeader("X-Upload-Max-Size", String(MAX_FILE_SIZE_BYTES));
  res.setHeader("X-Upload-Allowed-Types", ALLOWED_TYPES.join(", "));
  res.json(result);
});

export const uploadFile = [
  upload.single("file"),
  multerErrorHandler,
  handleUpload,
];
