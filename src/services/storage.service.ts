import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AppError } from "../utils/errors";

export type UploadType = "avatar" | "group_cover" | "expense_proof";

export interface UploadResult {
  publicUrl: string;
  key: string;
}

// ─── Local disk storage (dev fallback) ────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ─── S3 client (only used when env vars are present) ──────────────────────────
function getS3Client(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
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
function buildKey(
  type: UploadType,
  ext: string,
  opts: { userId?: string; groupId?: string; expenseId?: string; originalName?: string }
): string {
  const prefix = process.env.AWS_S3_PATH_PREFIX;
  let key = "";
  switch (type) {
    case "avatar":
      if (!opts.userId) throw new AppError("userId required", 400);
      key = `images/users/${opts.userId}/avatar.${ext}`;
      break;
    case "group_cover":
      if (!opts.groupId) throw new AppError("groupId required", 400);
      key = `images/groups/${opts.groupId}/cover.${ext}`;
      break;
    case "expense_proof": {
      if (!opts.groupId || !opts.expenseId)
        throw new AppError("groupId and expenseId required", 400);
      const ts = Date.now();
      const safe = (opts.originalName || "file")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 60);
      key = `images/groups/${opts.groupId}/expenses/${opts.expenseId}/${ts}_${safe}`;
      break;
    }
    default:
      throw new AppError("Unknown upload type", 400);
  }
  return prefix ? `${prefix}/${key}` : key;
}

class StorageService {
  /**
   * Save uploaded file buffer.
   * - If S3 is configured → upload to S3
   * - Otherwise → save to local ./uploads/ and return a /uploads/ URL
   */
  async saveFile(
    type: UploadType,
    buffer: Buffer,
    mimetype: string,
    opts: { userId?: string; groupId?: string; expenseId?: string; originalName?: string }
  ): Promise<UploadResult> {
    const ext = (mimetype.split("/")[1] || "jpg").split(";")[0];
    const key = buildKey(type, ext, opts);

    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME || "tingting-proofs";

    if (s3) {
      // ── Production: upload to S3 ──────────────────────────────────────────
      try {
        console.log(`[StorageService] Uploading to S3: bucket=${bucket}, key=${key}, contentType=${mimetype}`);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
          })
        );
        console.log(`[StorageService] S3 Upload Success: ${key}`);
      } catch (err: any) {
        console.error(`[StorageService] S3 Upload FAILED: bucket=${bucket}, key=${key}`);
        console.error(`[StorageService] Error: ${err.message}`);
        if (err.$metadata) console.error(`[StorageService] Metadata:`, err.$metadata);
        throw new AppError(`S3 Upload failed: ${err.message}`, 500);
      }
      
      const publicBase =
        process.env.AWS_S3_PUBLIC_URL || process.env.AWS_S3_ENDPOINT || "";
      
      // If publicBase already contains the bucket name (virtual-hosted style), don't append it again
      const isVirtualHosted = publicBase.includes(`${bucket}.s3`);
      const url = isVirtualHosted 
        ? `${publicBase.replace(/\/$/, "")}/${key}`
        : `${publicBase.replace(/\/$/, "")}/${bucket}/${key}`;

      return {
        publicUrl: url,
        key,
      };
    } else {
      // ── Development: save to local disk ──────────────────────────────────
      const localPath = path.join(UPLOADS_DIR, key);
      ensureDir(path.dirname(localPath));
      fs.writeFileSync(localPath, buffer);

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
  async deleteFileByUrl(url: string): Promise<void> {
    if (!url) return;

    let key = "";
    if (url.includes("/uploads/images/")) {
      key = url.split("/uploads/")[1];
    } else {
      // For S3: try to extract the part after the bucket name or base URL
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const publicBase = process.env.AWS_S3_PUBLIC_URL || process.env.AWS_S3_ENDPOINT || "";
      
      if (bucket && url.includes(`/${bucket}/`)) {
        key = url.split(`/${bucket}/`)[1];
      } else if (publicBase) {
        // If it's a virtual-hosted URL or custom domain
        const baseUrlObj = new URL(publicBase);
        const urlObj = new URL(url);
        key = urlObj.pathname.substring(1); // Remove leading slash
      }
    }

    if (!key) return;

    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME || "tingting-proofs";

    if (s3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch (err) {
        console.error("Failed to delete from S3:", err);
      }
    } else {
      const localPath = path.join(UPLOADS_DIR, key);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (err) {
          console.error("Failed to delete local file:", err);
        }
      }
    }
  }
}

// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Multer (memory storage — we handle saving ourselves) ─────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and WebP images are allowed"));
    }
  },
});

export { MAX_FILE_SIZE_BYTES };

export const storageService = new StorageService();
