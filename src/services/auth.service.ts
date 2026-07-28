import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userService } from "./user.service";
import prisma from "../config/database";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { JWTPayload } from "../types/auth.types";

export class AuthService {
  async login(username: string, password_hash: string) {
    const user = await userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }

    if (user.status === "inactive") {
      throw new UnauthorizedError("Account is disabled");
    }

    const isMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      status: user.status,
      role: (user as any).role || 'USER', // Casting to any temporarily in case prisma types aren't loaded yet
    };

    const secret = process.env.JWT_SECRET || "nguyenquynhgia08102004camranhkhanhhoa";

    const token = jwt.sign(payload, secret, {
      expiresIn: "2h",
    });

    const refreshToken = jwt.sign(payload, secret, {
      expiresIn: "7d",
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: (user as any).full_name || null,
        email: user.email,
        avatar_url: user.avatar_url,
        status: user.status,
        role: (user as any).role || 'USER',
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userService.findById(userId);
    
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new ValidationError("Current password is incorrect");
    }

    return userService.updatePassword(userId, newPassword);
  }

  async refreshToken(refreshToken: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured");

    const isBlacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token: refreshToken },
    });
    if (isBlacklisted) throw new UnauthorizedError("Refresh token is invalidated");

    try {
      const decoded = jwt.verify(refreshToken, secret) as JWTPayload;
      const payload: JWTPayload = {
        userId: decoded.userId,
        username: decoded.username,
        status: decoded.status,
        role: decoded.role,
      };

      const newToken = jwt.sign(payload, secret, { expiresIn: "2h" });
      return { token: newToken };
    } catch (err) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return;

    try {
      const decodedAccess = jwt.verify(accessToken, secret, { ignoreExpiration: true }) as any;
      await prisma.tokenBlacklist.create({
        data: {
          token: accessToken,
          expires_at: new Date(decodedAccess.exp * 1000),
        },
      }).catch(() => {}); // Ignore if already blacklisted
      
      if (refreshToken) {
        const decodedRefresh = jwt.verify(refreshToken, secret, { ignoreExpiration: true }) as any;
        await prisma.tokenBlacklist.create({
          data: {
            token: refreshToken,
            expires_at: new Date(decodedRefresh.exp * 1000),
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error blacklisting token", err);
    }
  }
}

export const authService = new AuthService();
