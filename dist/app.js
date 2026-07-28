"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const error_handler_1 = require("./middleware/error-handler");
const status_middleware_1 = require("./middleware/status.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const group_routes_1 = __importDefault(require("./routes/group.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const storage_routes_1 = __importDefault(require("./routes/storage.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
// Disable server fingerprinting
app.disable("x-powered-by");
// Trust proxy for rate limiter (since Render acts as a reverse proxy)
app.set("trust proxy", 1);
// CORS — restrict to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin or matching origin or wildcard *
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Middlewares
app.use(rate_limit_middleware_1.globalLimiter);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "2mb" }));
// Serve uploaded files (local dev)
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
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
app.use("/api/auth", auth_routes_1.default);
// Protected routes require active status
app.use("/api", auth_middleware_1.authenticate);
app.use("/api", status_middleware_1.requireActiveUser);
app.use("/api/groups", group_routes_1.default);
app.use("/api/expenses", expense_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
app.use("/api/storage", storage_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
// Catch-all for unknown routes
app.use((req, res) => {
    res.status(404).json({ status: "error", message: `Route not found: ${req.method} ${req.path}` });
});
// Error Handler
app.use(error_handler_1.errorHandler);
exports.default = app;
