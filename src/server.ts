import "dotenv/config";
import bcrypt from "bcrypt";
import app from "./app";
import prisma from "./config/database";
import { logger } from "./utils/logger.util";

import { createServer } from "http";
import { initSocket } from "./socket";

const PORT = process.env.PORT || 3000;
const server = createServer(app);

async function start() {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const portMatch = dbUrl.match(/:(\d+)\//);
    logger.info(`[DEBUG] Server is attempting to connect to database on port: ${portMatch ? portMatch[1] : "unknown"}`);
    
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected successfully");

    // Tự động tạo tài khoản Admin gqnadmin nếu chưa có
    const adminExists = await prisma.user.findUnique({ where: { username: "gqnadmin" } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("quynhgia11b5", 10);
      await prisma.user.create({
        data: {
          username: "gqnadmin",
          email: "gqnadmin@tingting.com",
          password_hash: hashedPassword,
          status: "active",
          role: "ADMIN"
        }
      });
      logger.info("Admin account 'gqnadmin' created successfully!");
    }

    initSocket(server);

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
