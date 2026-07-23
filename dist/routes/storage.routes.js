"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storage_controller_1 = require("../controllers/storage.controller");
const router = (0, express_1.Router)();
// Unified direct upload (multipart/form-data)
router.post("/upload", storage_controller_1.uploadFile);
exports.default = router;
