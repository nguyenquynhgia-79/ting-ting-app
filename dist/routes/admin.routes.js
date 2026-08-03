"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// Tất cả API của Admin đều cần xác thực và kiểm tra quyền ADMIN
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.isAdmin);
router.get("/stats", admin_controller_1.getSystemStats);
router.get("/users", admin_controller_1.getUsers);
router.post("/users", admin_controller_1.createUser);
router.get("/groups", admin_controller_1.getGroups);
router.get("/logs", admin_controller_1.getLogs);
router.get("/chart-data", admin_controller_1.getChartData);
router.post("/notifications/broadcast", admin_controller_1.broadcastNotification);
router.patch("/users/:id/status", admin_controller_1.updateUserStatus);
router.patch("/users/:id/subscription", admin_controller_1.updateUserSubscription);
exports.default = router;
