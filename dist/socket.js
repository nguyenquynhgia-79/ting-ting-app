"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToUsers = exports.sendNotificationToUser = exports.getIo = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
// Keep track of connected users: userId -> socketId
const connectedUsers = new Map();
const initSocket = (server) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
        .split(",")
        .map((o) => o.trim());
    const corsOrigin = allowedOrigins.includes("*") ? "*" : allowedOrigins;
    io = new socket_io_1.Server(server, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST"],
            credentials: true,
        }
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret)
                return next(new Error("JWT_SECRET not configured"));
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            socket.data.userId = decoded.userId;
            next();
        }
        catch (err) {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        console.log(`User connected: ${userId} (${socket.id})`);
        connectedUsers.set(userId, socket.id);
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}`);
            connectedUsers.delete(userId);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getIo = getIo;
const sendNotificationToUser = (userId, eventName, payload) => {
    if (!io)
        return;
    const socketId = connectedUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit(eventName, payload);
    }
};
exports.sendNotificationToUser = sendNotificationToUser;
const sendToUsers = (userIds, eventName, payload) => {
    if (!io)
        return;
    userIds.forEach(userId => {
        const socketId = connectedUsers.get(userId);
        if (socketId) {
            io.to(socketId).emit(eventName, payload);
        }
    });
};
exports.sendToUsers = sendToUsers;
