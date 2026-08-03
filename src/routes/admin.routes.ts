import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { getSystemStats, getUsers, updateUserStatus, getGroups, getLogs, getChartData, broadcastNotification, createUser, updateUserSubscription } from "../controllers/admin.controller";

const router = Router();

// Tất cả API của Admin đều cần xác thực và kiểm tra quyền ADMIN
router.use(authenticate);
router.use(isAdmin);

router.get("/stats", getSystemStats);
router.get("/users", getUsers);
router.post("/users", createUser);
router.get("/groups", getGroups);
router.get("/logs", getLogs);
router.get("/chart-data", getChartData);
router.post("/notifications/broadcast", broadcastNotification);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/subscription", updateUserSubscription);

export default router;
