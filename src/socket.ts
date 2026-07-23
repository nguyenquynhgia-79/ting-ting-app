import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server;

// Keep track of connected users: userId -> socketId
const connectedUsers = new Map<string, string>();

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
    const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error("JWT_SECRET not configured"));
      const decoded = jwt.verify(token, secret) as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
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

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const sendNotificationToUser = (userId: string, eventName: string, payload: any) => {
  if (!io) return;
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(eventName, payload);
  }
};

export const sendToUsers = (userIds: string[], eventName: string, payload: any) => {
  if (!io) return;
  userIds.forEach(userId => {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit(eventName, payload);
    }
  });
};
