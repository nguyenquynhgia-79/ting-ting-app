# 🔐 TingTing — Lịch Trình Nâng Cấp Bảo Mật

> **Phiên bản:** 1.0 | **Cập nhật:** 2026-05-14  
> Tài liệu này mô tả các lỗ hổng bảo mật hiện tại và kế hoạch nâng cấp theo từng giai đoạn.

---

## 📋 Mục Lục

1. [Tổng quan hiện trạng](#1-tổng-quan-hiện-trạng)
2. [Giai đoạn 1 — Khẩn cấp (Tuần 1)](#2-giai-đoạn-1--khẩn-cấp-tuần-1)
3. [Giai đoạn 2 — Quan trọng (Tuần 2–3)](#3-giai-đoạn-2--quan-trọng-tuần-23)
4. [Giai đoạn 3 — Nâng cao (Tuần 4–6)](#4-giai-đoạn-3--nâng-cao-tuần-46)
5. [Giai đoạn 4 — Production-ready (Tháng 2)](#5-giai-đoạn-4--production-ready-tháng-2)
6. [Checklist tổng hợp](#6-checklist-tổng-hợp)

---

## 1. Tổng Quan Hiện Trạng

### ✅ Điểm tốt hiện có
| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Password hashing | ✅ Tốt | bcrypt với salt rounds=10 |
| JWT Authentication | ✅ Cơ bản | Middleware xác thực đã có |
| Helmet.js | ✅ Có | HTTP security headers |
| CORS | ⚠️ Yếu | Đang cho phép `*` (tất cả origins) |
| User status check | ✅ Có | `requireActiveUser` middleware |
| Input Authorization | ✅ Một phần | Kiểm tra membership trong service |

### 🚨 Lỗ hổng nghiêm trọng cần xử lý ngay
| Lỗ hổng | Mức độ | File liên quan |
|---|---|---|
| JWT_SECRET dùng fallback `"default_secret"` | 🔴 Nghiêm trọng | `auth.middleware.ts`, `auth.service.ts` |
| CORS mở hoàn toàn `origin: "*"` | 🔴 Nghiêm trọng | `app.ts` |
| Không có Rate Limiting | 🔴 Nghiêm trọng | `app.ts` |
| Không có input validation/sanitization | 🟠 Cao | Tất cả controllers |
| JWT không có blacklist (logout không thực sự) | 🟠 Cao | `auth.service.ts` |
| Token hết hạn 7 ngày — quá dài | 🟡 Trung bình | `auth.service.ts` |
| SQLite dùng trong production | 🟡 Trung bình | `schema.prisma` |
| Thông tin ngân hàng lưu plain text | 🟡 Trung bình | `schema.prisma` |
| Không có audit log | 🟡 Trung bình | Toàn bộ |
| Socket.io CORS mở `*` | 🟠 Cao | `socket.ts` |

---

## 2. Giai Đoạn 1 — Khẩn Cấp (Tuần 1)

> **Mục tiêu:** Vá các lỗ hổng có thể bị khai thác ngay lập tức.

### 2.1 Cố định JWT Secret

**Vấn đề:** Code dùng `process.env.JWT_SECRET || "default_secret"` — nếu quên set env, toàn bộ token có thể bị forge.

**Giải pháp:**
```typescript
// src/middleware/auth.middleware.ts
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set!");
}
const decoded = jwt.verify(token, secret) as JWTPayload;
```

```typescript
// src/services/auth.service.ts  
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET not configured");
const token = jwt.sign(payload, secret, { expiresIn: "2h" }); // Rút ngắn xuống 2h
```

**File `.env` cần có:**
```env
JWT_SECRET=<random 64-char hex string>
JWT_REFRESH_SECRET=<random 64-char hex string khác>
```

**Tạo secret an toàn:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 2.2 Cấu hình CORS đúng

**Vấn đề:** `app.use(cors())` và socket `origin: "*"` cho phép mọi domain gọi API.

**Giải pháp:**
```typescript
// src/app.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

```typescript
// src/socket.ts
io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ["GET", "POST"],
    credentials: true,
  }
});
```

**.env:**
```env
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

---

### 2.3 Triển khai Rate Limiting

**Vấn đề:** Không có giới hạn số request — dễ bị brute-force mật khẩu và DDoS.

**Cài đặt:**
```bash
npm install express-rate-limit
```

**Giải pháp:**
```typescript
// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

// Giới hạn toàn bộ API
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Giới hạn nghiêm ngặt cho auth
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Chỉ 10 lần đăng nhập / 15 phút
  message: { message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.' },
  skipSuccessfulRequests: true,
});
```

```typescript
// src/app.ts
import { globalLimiter, authLimiter } from './middleware/rate-limit.middleware';

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

---

## 3. Giai Đoạn 2 — Quan Trọng (Tuần 2–3)

> **Mục tiêu:** Xây dựng lớp bảo vệ dữ liệu và xác thực đầu vào.

### 3.1 Input Validation với Zod

**Vấn đề:** Controller nhận dữ liệu từ `req.body` không qua validate — dễ bị injection và bad data.

**Cài đặt:**
```bash
npm install zod
```

**Tạo schemas:**
```typescript
// src/validation/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Phải có ít nhất 1 số'),
});

// src/validation/expense.schema.ts
export const createExpenseSchema = z.object({
  group_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
  description: z.string().max(500).optional(),
  split_type: z.enum(['EQUAL', 'CUSTOM']),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount_owed: z.number().nonnegative().optional(),
  })).min(1),
});

// src/validation/group.schema.ts
export const createGroupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  memberIds: z.array(z.string().uuid()).optional(),
});
```

**Middleware validate:**
```typescript
// src/middleware/validate.middleware.ts
import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodSchema) => 
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // Replace with sanitized data
    next();
  };
```

**Áp dụng vào routes:**
```typescript
// src/routes/auth.routes.ts
import { validate } from '../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../validation/auth.schema';

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/register', authLimiter, validate(registerSchema), authController.register);
```

---

### 3.2 Refresh Token & Blacklist

**Vấn đề:** JWT 7 ngày không thể thu hồi — khi logout, token vẫn dùng được.

**Giải pháp — Thêm model RefreshToken:**
```prisma
// prisma/schema.prisma
model RefreshToken {
  id         String   @id @default(uuid())
  token      String   @unique
  user_id    String
  expires_at DateTime
  revoked    Boolean  @default(false)
  created_at DateTime @default(now())

  user       User     @relation(fields: [user_id], references: [id])

  @@map("refresh_tokens")
}

model TokenBlacklist {
  id         String   @id @default(uuid())
  token_jti  String   @unique  // JWT ID claim
  expires_at DateTime
  created_at DateTime @default(now())

  @@map("token_blacklist")
}
```

**Cập nhật auth service:**
```typescript
// src/services/auth.service.ts
async login(username: string, password: string) {
  // ... validate user ...
  
  const jti = crypto.randomUUID(); // JWT ID duy nhất
  const accessToken = jwt.sign(
    { ...payload, jti }, 
    process.env.JWT_SECRET!, 
    { expiresIn: '15m' } // Access token ngắn hơn
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  // Lưu refresh token vào DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });
  
  return { accessToken, refreshToken, user: { ... } };
}

async logout(jti: string, expiresAt: Date) {
  // Blacklist access token
  await prisma.tokenBlacklist.create({
    data: { token_jti: jti, expires_at: expiresAt }
  });
}
```

---

### 3.3 Mã hóa thông tin nhạy cảm

**Vấn đề:** `account_number`, `bank_name` lưu plain text trong DB — nếu DB bị lộ, thông tin ngân hàng bị lộ toàn bộ.

**Cài đặt:**
```bash
npm install @node-rs/argon2  # Hoặc dùng crypto built-in
```

**Giải pháp dùng AES-256:**
```typescript
// src/utils/crypto.util.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes hex
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Tạo encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**.env:**
```env
ENCRYPTION_KEY=<64-char hex từ lệnh trên>
```

**Áp dụng trong user service:**
```typescript
// src/services/user.service.ts
import { encrypt, decrypt } from '../utils/crypto.util';

async updateBankInfo(userId: string, data: { ... }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      bank_name: data.bank_name,
      account_number: data.account_number ? encrypt(data.account_number) : undefined,
      account_name: data.account_name,
    }
  });
}

// Khi đọc ra cần decrypt:
decryptBankInfo(user: any) {
  return {
    ...user,
    account_number: user.account_number ? decrypt(user.account_number) : null,
  };
}
```

---

## 4. Giai Đoạn 3 — Nâng Cao (Tuần 4–6)

> **Mục tiêu:** Monitoring, audit log và phòng thủ chuyên sâu.

### 4.1 Audit Log

**Mục đích:** Ghi lại mọi hành động quan trọng (ai làm gì, lúc nào, với dữ liệu nào).

**Prisma schema:**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  user_id     String?
  action      String   // e.g. CREATE_EXPENSE, DELETE_GROUP, UPDATE_EXPENSE
  entity_type String   // e.g. expense, group, payment
  entity_id   String?
  old_value   String?  // JSON string của giá trị cũ
  new_value   String?  // JSON string của giá trị mới
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())

  @@map("audit_logs")
  @@index([user_id])
  @@index([entity_id])
  @@index([created_at])
}
```

**Middleware audit:**
```typescript
// src/middleware/audit.middleware.ts
import prisma from '../config/database';

export const auditLog = (action: string, entityType: string) => 
  async (req: any, res: any, next: any) => {
    const originalJson = res.json.bind(res);
    
    res.json = async (data: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await prisma.auditLog.create({
          data: {
            user_id: req.user?.userId,
            action,
            entity_type: entityType,
            entity_id: data?.id || req.params?.id,
            new_value: JSON.stringify(req.body),
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
          }
        }).catch(console.error); // Non-blocking
      }
      return originalJson(data);
    };
    next();
  };
```

**Áp dụng:**
```typescript
// src/routes/expense.routes.ts
router.post('/', auditLog('CREATE_EXPENSE', 'expense'), expenseController.createExpense);
router.patch('/:id', auditLog('UPDATE_EXPENSE', 'expense'), expenseController.updateExpense);
router.delete('/:id', auditLog('DELETE_EXPENSE', 'expense'), expenseController.deleteExpense);
```

---

### 4.2 Bảo mật File Upload

**Vấn đề hiện tại:** Không có kiểm tra loại file, kích thước và nội dung — có thể upload file nguy hiểm.

**Cài đặt:**
```bash
npm install file-type
```

**Giải pháp:**
```typescript
// src/middleware/upload-security.middleware.ts
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateUpload = async (req: any, res: any, next: any) => {
  const file = req.file;
  if (!file) return next();
  
  // Kiểm tra kích thước
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ message: 'File quá lớn (tối đa 5MB)' });
  }
  
  // Kiểm tra magic bytes (không chỉ extension)
  const fileType = await fileTypeFromBuffer(file.buffer);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    return res.status(400).json({ message: 'Chỉ chấp nhận file ảnh JPG, PNG, WebP' });
  }
  
  // Đổi tên file để tránh path traversal
  file.originalname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileType.ext}`;
  
  next();
};
```

---

### 4.3 Security Headers nâng cao

```typescript
// src/app.ts
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || ''],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Ẩn thông tin server
app.disable('x-powered-by');
```

---

### 4.4 Password Policy nâng cao

```typescript
// src/validation/auth.schema.ts
export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
    .min(8, 'Tối thiểu 8 ký tự')
    .max(128, 'Tối đa 128 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Phải có ít nhất 1 số')
    .regex(/[^A-Za-z0-9]/, 'Phải có ít nhất 1 ký tự đặc biệt'),
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'Mật khẩu mới không được trùng mật khẩu cũ',
  path: ['newPassword'],
});
```

---

## 5. Giai Đoạn 4 — Production-Ready (Tháng 2)

### 5.1 Chuyển sang PostgreSQL

**Vấn đề:** SQLite không phù hợp production — không hỗ trợ concurrent writes tốt.

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tingting_db?schema=public
```

---

### 5.2 HTTPS & TLS

**Nginx config mẫu:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

---

### 5.3 Cấu hình .env Production

```env
# === CRITICAL — PHẢI SET TRƯỚC KHI DEPLOY ===
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# JWT — Tạo bằng: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex-khác>

# Encryption — Tạo bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<32-char-hex>

# CORS
ALLOWED_ORIGINS=https://your-frontend.com

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_BUCKET_NAME=...
```

---

### 5.4 Monitoring & Alerting

**Cài đặt:**
```bash
npm install winston  # Logging
```

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production' 
      ? [new winston.transports.Console()] 
      : [])
  ],
});
```

**Ghi log các sự kiện bảo mật quan trọng:**
```typescript
// Đăng nhập thất bại liên tiếp
logger.warn('Failed login attempt', { username, ip: req.ip, userAgent: req.headers['user-agent'] });

// Truy cập trái phép
logger.error('Unauthorized access attempt', { userId, resource, ip: req.ip });
```

---

## 6. Checklist Tổng Hợp

### Giai đoạn 1 — Khẩn cấp ✅

- [x] Xóa fallback `"default_secret"` trong JWT
- [x] Tạo JWT_SECRET mạnh trong `.env` _(thêm ALLOWED_ORIGINS, nhắc thay secret trước production)_
- [x] Cấu hình CORS giới hạn origin cụ thể _(app.ts + socket.ts)_
- [x] Cài đặt Rate Limiting cho auth routes _(global 300req/15min, auth 10req/15min)_
- [x] Rút ngắn JWT access token xuống 15–60 phút _(đã đổi từ 7d → 2h)_

### Giai đoạn 2 — Quan trọng ✅

- [x] Cài đặt Zod validation cho tất cả request body
- [x] Triển khai Refresh Token + Blacklist
- [x] Mã hóa `account_number` trong DB
- [x] Validate kích thước và magic bytes file upload
- [x] Thêm model `TokenBlacklist` vào Prisma

### Giai đoạn 3 — Nâng cao ✅

- [x] Tạo bảng `AuditLog` và middleware ghi log
- [x] Nâng cấp Security Headers với Helmet
- [x] Áp dụng Password Policy nghiêm ngặt hơn
- [x] Bảo mật upload với `file-type` library
- [x] Ẩn `X-Powered-By` header

### Giai đoạn 4 — Production ✅

- [x] Chuyển từ SQLite sang PostgreSQL
- [x] Cấu hình HTTPS/TLS với Nginx
- [x] Thiết lập cấu hình `.env` production đầy đủ
- [x] Cài đặt Winston logger
- [x] Ghi log sự kiện bảo mật quan trọng
- [x] Chạy `npm audit` định kỳ

---

## 📞 Phản hồi Lỗ Hổng Bảo Mật

Nếu phát hiện lỗ hổng bảo mật, **không** tạo public issue. Thay vào đó:
- Ghi lại chi tiết: mô tả, bước tái hiện, ảnh hưởng
- Báo cáo trực tiếp cho team qua kênh nội bộ

---

*Tài liệu này cần được review và cập nhật định kỳ mỗi quý.*
