import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/error-handler";
import { requireActiveUser } from "./middleware/status.middleware";
import { authenticate } from "./middleware/auth.middleware";

import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import expenseRoutes from "./routes/expense.routes";
import paymentRoutes from "./routes/payment.routes";
import storageRoutes from "./routes/storage.routes";
import userRoutes from "./routes/user.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

// Disable server fingerprinting
app.disable("x-powered-by");

// CORS — restrict to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 login attempts per 15 min
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút." },
});

// Middlewares
app.use(globalLimiter);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve uploaded files (local dev)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);

// Protected routes require active status
app.use(authenticate);
app.use(requireActiveUser);

app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// Error Handler
app.use(errorHandler);

export default app;
