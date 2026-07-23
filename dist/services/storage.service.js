"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.MAX_FILE_SIZE_BYTES = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const errors_1 = require("../utils/errors");
// ─── Local disk storage (dev fallback) ────────────────────────────────────────
const UPLOADS_DIR = path_1.default.join(process.cwd(), "uploads");
function ensureDir(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
}
// ─── S3 client (only used when env vars are present) ──────────────────────────
function getS3Client() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return null;
    }
    return new client_s3_1.S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        endpoint: process.env.AWS_S3_ENDPOINT || undefined,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        // Only use forcePathStyle if it's explicitly an R2 endpoint or non-AWS S3
        forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
    });
}
// ─── Key builder ──────────────────────────────────────────────────────────────
function buildKey(type, ext, opts) {
    const prefix = process.env.AWS_S3_PATH_PREFIX;
    let key = "";
    switch (type) {
        case "avatar":
            if (!opts.userId)
                throw new errors_1.AppError("userId required", 400);
            key = `images/users/${opts.userId}/avatar.${ext}`;
            break;
        case "group_cover":
            if (!opts.groupId)
                throw new errors_1.AppError("groupId required", 400);
            key = `images/groups/${opts.groupId}/cover.${ext}`;
            break;
        case "expense_proof": {
            if (!opts.groupId || !opts.expenseId)
                throw new errors_1.AppError("groupId and expenseId required", 400);
            const ts = Date.now();
            const safe = (opts.originalName || "file")
                .replace(/[^a-zA-Z0-9._-]/g, "_")
                .substring(0, 60);
            key = `images/groups/${opts.groupId}/expenses/${opts.expenseId}/${ts}_${safe}`;
            break;
        }
        default:
            throw new errors_1.AppError("Unknown upload type", 400);
    }
    return prefix ? `${prefix}/${key}` : key;
}
class StorageService {
    /**
     * Save uploaded file buffer.
     * - If S3 is configured → upload to S3
     * - Otherwise → save to local ./uploads/ and return a /uploads/ URL
     */
    async saveFile(type, buffer, mimetype, opts) {
        const ext = (mimetype.split("/")[1] || "jpg").split(";")[0];
        const key = buildKey(type, ext, opts);
        const s3 = getS3Client();
        const bucket = process.env.AWS_S3_BUCKET_NAME || "tingting-proofs";
        if (s3) {
            // ── Production: upload to S3 ──────────────────────────────────────────
            try {
                console.log(`[StorageService] Uploading to S3: bucket=${bucket}, key=${key}, contentType=${mimetype}`);
                await s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: mimetype,
                }));
                console.log(`[StorageService] S3 Upload Success: ${key}`);
            }
            catch (err) {
                console.error(`[StorageService] S3 Upload FAILED: bucket=${bucket}, key=${key}`);
                console.error(`[StorageService] Error: ${err.message}`);
                if (err.$metadata)
                    console.error(`[StorageService] Metadata:`, err.$metadata);
                throw new errors_1.AppError(`S3 Upload failed: ${err.message}`, 500);
            }
            const publicBase = process.env.AWS_S3_PUBLIC_URL || process.env.AWS_S3_ENDPOINT || "";
            // If publicBase already contains the bucket name (virtual-hosted style), don't append it again
            const isVirtualHosted = publicBase.includes(`${bucket}.s3`);
            const url = isVirtualHosted
                ? `${publicBase.replace(/\/$/, "")}/${key}`
                : `${publicBase.replace(/\/$/, "")}/${bucket}/${key}`;
            return {
                publicUrl: url,
                key,
            };
        }
        else {
            // ── Development: save to local disk ──────────────────────────────────
            const localPath = path_1.default.join(UPLOADS_DIR, key);
            ensureDir(path_1.default.dirname(localPath));
            fs_1.default.writeFileSync(localPath, buffer);
            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            return {
                publicUrl: `${baseUrl}/uploads/${key}`,
                key,
            };
        }
    }
    /**
     * Delete a file based on its public URL.
     * Extracts the key from the URL and deletes from S3 or local disk.
     */
    async deleteFileByUrl(url) {
        if (!url)
            return;
        let key = "";
        if (url.includes("/uploads/images/")) {
            key = url.split("/uploads/")[1];
        }
        else {
            // For S3: try to extract the part after the bucket name or base URL
            const bucket = process.env.AWS_S3_BUCKET_NAME;
            const publicBase = process.env.AWS_S3_PUBLIC_URL || process.env.AWS_S3_ENDPOINT || "";
            if (bucket && url.includes(`/${bucket}/`)) {
                key = url.split(`/${bucket}/`)[1];
            }
            else if (publicBase) {
                // If it's a virtual-hosted URL or custom domain
                const baseUrlObj = new URL(publicBase);
                const urlObj = new URL(url);
                key = urlObj.pathname.substring(1); // Remove leading slash
            }
        }
        if (!key)
            return;
        const s3 = getS3Client();
        const bucket = process.env.AWS_S3_BUCKET_NAME || "tingting-proofs";
        if (s3) {
            try {
                await s3.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }));
            }
            catch (err) {
                console.error("Failed to delete from S3:", err);
            }
        }
        else {
            const localPath = path_1.default.join(UPLOADS_DIR, key);
            if (fs_1.default.existsSync(localPath)) {
                try {
                    fs_1.default.unlinkSync(localPath);
                }
                catch (err) {
                    console.error("Failed to delete local file:", err);
                }
            }
        }
    }
}
// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
exports.MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
// ─── Multer (memory storage — we handle saving ourselves) ─────────────────────
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only JPEG, PNG and WebP images are allowed"));
        }
    },
});
exports.storageService = new StorageService();
