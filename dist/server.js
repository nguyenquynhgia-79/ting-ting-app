"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const logger_util_1 = require("./utils/logger.util");
const http_1 = require("http");
const socket_1 = require("./socket");
const PORT = process.env.PORT || 3000;
const server = (0, http_1.createServer)(app_1.default);
async function start() {
    try {
        const dbUrl = process.env.DATABASE_URL || "";
        const portMatch = dbUrl.match(/:(\d+)\//);
        logger_util_1.logger.info(`[DEBUG] Server is attempting to connect to database on port: ${portMatch ? portMatch[1] : "unknown"}`);
        // Test database connection
        await database_1.default.$connect();
        logger_util_1.logger.info("Database connected successfully");
        // Tự động tạo tài khoản Admin gqnadmin nếu chưa có
        const adminExists = await database_1.default.user.findUnique({ where: { username: "gqnadmin" } });
        if (!adminExists) {
            const hashedPassword = await bcrypt_1.default.hash("quynhgia11b5", 10);
            await database_1.default.user.create({
                data: {
                    username: "gqnadmin",
                    email: "gqnadmin@tingting.com",
                    password_hash: hashedPassword,
                    status: "active",
                    role: "ADMIN"
                }
            });
            logger_util_1.logger.info("Admin account 'gqnadmin' created successfully!");
        }
        (0, socket_1.initSocket)(server);
        server.listen(PORT, () => {
            logger_util_1.logger.info(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to start server:", error);
        process.exit(1);
    }
}
start();
// Graceful shutdown
process.on("SIGINT", async () => {
    await database_1.default.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await database_1.default.$disconnect();
    process.exit(0);
});
