"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const multer_1 = __importDefault(require("multer"));
const storage_service_1 = require("../services/storage.service");
const error_handler_1 = require("../middleware/error-handler");
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
function multerErrorHandler(err, _req, res, next) {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({
                message: `File too large. Maximum allowed size is ${storage_service_1.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
                maxSizeBytes: storage_service_1.MAX_FILE_SIZE_BYTES,
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
const handleUpload = (0, error_handler_1.asyncHandler)(async (req, res) => {
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
    // Validate magic bytes using file-type (ESM package)
    const fileTypeModule = await Function('return import("file-type")')();
    const fileType = await fileTypeModule.fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !ALLOWED_TYPES.includes(fileType.mime)) {
        res.status(415).json({
            message: "Invalid file content. The file does not match its extension or is corrupted.",
            allowedTypes: ALLOWED_TYPES,
        });
        return;
    }
    // Double-check size (belt-and-suspenders)
    if (req.file.size > storage_service_1.MAX_FILE_SIZE_BYTES) {
        res.status(413).json({
            message: `File too large. Maximum allowed size is ${storage_service_1.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
            maxSizeBytes: storage_service_1.MAX_FILE_SIZE_BYTES,
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
    const result = await storage_service_1.storageService.saveFile(type, req.file.buffer, req.file.mimetype, { userId, groupId, expenseId, originalName: req.file.originalname });
    // Inform client of limits via response headers
    res.setHeader("X-Upload-Max-Size", String(storage_service_1.MAX_FILE_SIZE_BYTES));
    res.setHeader("X-Upload-Allowed-Types", ALLOWED_TYPES.join(", "));
    res.json(result);
});
exports.uploadFile = [
    storage_service_1.upload.single("file"),
    multerErrorHandler,
    handleUpload,
];
