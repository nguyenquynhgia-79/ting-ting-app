"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const logger_util_1 = require("./utils/logger.util");
const http_1 = require("http");
const socket_1 = require("./socket");
const PORT = process.env.PORT || 3000;
const server = (0, http_1.createServer)(app_1.default);
async function start() {
    try {
        // Test database connection
        await database_1.default.$connect();
        logger_util_1.logger.info("Database connected successfully");
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
