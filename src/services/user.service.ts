import prisma from "../config/database";
import bcrypt from "bcrypt";
import { ConflictError, NotFoundError } from "../utils/errors";
import { UserStatus } from "@prisma/client";
import { encrypt, decrypt } from "../utils/encryption.util";
import { cacheService } from "./cache.service";
const mapUser = (user: any) => {
  if (!user) return user;
  if (user.account_number) {
    user.account_number = decrypt(user.account_number);
  }
  return user;
};

export class UserService {
  async createUser(data: { username: string; email: string; password_hash: string; full_name?: string; phone_number?: string; role?: any }) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: data.username }, { email: data.email }] },
    });

    if (existing) {
      throw new ConflictError("Username or Email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password_hash, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password_hash: hashedPassword,
        status: "require_password_change",
      },
    });
    return mapUser(user);
  }

  async findByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });
    return mapUser(user);
  }

  async findById(id: string) {
    const cacheKey = `user_${id}`;
    let user = cacheService.get<any>(cacheKey);
    
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id },
      });
      if (!user) throw new NotFoundError("User not found");
      cacheService.set(cacheKey, user, 300); // cache for 5 minutes
    }
    return mapUser(user);
  }

  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        status: "active",
      },
    });
    cacheService.del(`user_${userId}`);
    return mapUser(user);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar_url: true }
    });

    if (existing?.avatar_url && existing.avatar_url !== avatarUrl) {
      const { storageService } = require("./storage.service");
      await storageService.deleteFileByUrl(existing.avatar_url);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: avatarUrl },
    });
    cacheService.del(`user_${userId}`);
    return mapUser(user);
  }

  async updateBankInfo(userId: string, data: { bank_name?: string, account_number?: string, account_name?: string }) {
    const encryptedAccountNumber = data.account_number ? encrypt(data.account_number) : undefined;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        bank_name: data.bank_name,
        account_number: encryptedAccountNumber,
        account_name: data.account_name
      }
    });
    cacheService.del(`user_${userId}`);
    return mapUser(user);
  }
  async getUserSummary(userId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId }
    });

    let totalBalance = 0;
    let totalLent = 0;
    let totalBorrowed = 0;

    memberships.forEach(m => {
      const balance = Number(m.balance);
      totalBalance += balance;
      if (balance > 0) {
        totalLent += balance;
      } else if (balance < 0) {
        totalBorrowed += Math.abs(balance);
      }
    });

    return {
      total_balance: totalBalance,
      total_lent: totalLent,
      total_borrowed: totalBorrowed
    };
  }
}

export const userService = new UserService();
