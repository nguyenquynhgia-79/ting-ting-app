import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/error-handler";
import { requireActiveUser } from "./middleware/status.middleware";
import { authenticate } from "./middleware/auth.middleware";
import { globalLimiter } from "./middleware/rate-limit.middleware";

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

// Trust proxy for rate limiter (since Render acts as a reverse proxy)
app.set("trust proxy", 1);

// CORS — restrict to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or matching origin or wildcard *
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
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

// Health check & Root
app.get("/", (req, res) => {
  res.send("TingTing API is running!");
});
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);

// Protected routes require active status
app.use("/api", authenticate);
app.use("/api", requireActiveUser);

app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ status: "error", message: `Route not found: ${req.method} ${req.path}` });
});

// Error Handler
app.use(errorHandler);

export default app;
