"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseService = exports.ExpenseService = void 0;
const database_1 = __importDefault(require("../config/database"));
const errors_1 = require("../utils/errors");
const socket_1 = require("../socket");
class ExpenseService {
    async createExpense(data) {
        return database_1.default.$transaction(async (tx) => {
            // 1. Verify group and membership
            const member = await tx.groupMember.findUnique({
                where: {
                    group_id_user_id: {
                        group_id: data.group_id,
                        user_id: data.payer_id,
                    },
                },
            });
            if (!member) {
                throw new errors_1.ForbiddenError("You are not a member of this group");
            }
            const finalSplits = [];
            const totalAmount = data.amount;
            if (data.split_type === "EQUAL") {
                const count = data.splits.length;
                if (count === 0)
                    throw new errors_1.ValidationError("No members selected for split");
                const part = Math.floor(totalAmount / count);
                const remainder = totalAmount - (part * count);
                data.splits.forEach((s) => {
                    let amount = part;
                    if (s.user_id === data.payer_id) {
                        amount += remainder;
                    }
                    finalSplits.push({ user_id: s.user_id, amount_owed: amount });
                });
            }
            else {
                // CUSTOM
                let assignedSum = 0;
                data.splits.forEach((s) => {
                    if (s.user_id !== data.payer_id) {
                        if (s.amount_owed === undefined)
                            throw new errors_1.ValidationError("Custom split requires amount for each user");
                        assignedSum += s.amount_owed;
                        finalSplits.push({ user_id: s.user_id, amount_owed: s.amount_owed });
                    }
                });
                if (assignedSum > totalAmount) {
                    throw new errors_1.ValidationError("Total assigned amount exceeds expense amount");
                }
                finalSplits.push({
                    user_id: data.payer_id,
                    amount_owed: totalAmount - assignedSum,
                });
            }
            // 2. Create Expense
            const expense = await tx.expense.create({
                data: {
                    group_id: data.group_id,
                    payer_id: data.payer_id,
                    amount: totalAmount,
                    description: data.description,
                    split_type: data.split_type,
                    splits: {
                        create: finalSplits,
                    },
                },
            });
            // 3. Update Balances
            // Payer balance increases by totalAmount
            await tx.groupMember.update({
                where: {
                    group_id_user_id: { group_id: data.group_id, user_id: data.payer_id },
                },
                data: {
                    balance: { increment: totalAmount },
                },
            });
            // Each split decreases balance of the user
            for (const split of finalSplits) {
                await tx.groupMember.update({
                    where: {
                        group_id_user_id: { group_id: data.group_id, user_id: split.user_id },
                    },
                    data: {
                        balance: { decrement: split.amount_owed },
                    },
                });
            }
            // Notify users involved in the split (except the payer)
            const { notificationService } = require("./notification.service");
            const payer = await tx.user.findUnique({ where: { id: data.payer_id } });
            const group = await tx.group.findUnique({ where: { id: data.group_id } });
            if (payer && group) {
                for (const split of finalSplits) {
                    if (split.user_id !== data.payer_id && split.amount_owed > 0) {
                        await notificationService.createNotification({
                            userId: split.user_id,
                            type: "NEW_EXPENSE",
                            title: "Khoản chi mới",
                            message: `${payer.username} vừa thêm khoản chi "${data.description || 'Không tên'}" trong nhóm "${group.name}". Phần bạn cần trả là ${split.amount_owed.toLocaleString()}đ.`,
                            relatedEntityId: group.id, // navigate to group
                        });
                    }
                }
            }
            // Real-time: Notify all members of the group
            const members = await tx.groupMember.findMany({ where: { group_id: data.group_id }, select: { user_id: true } });
            (0, socket_1.sendToUsers)(members.map(m => m.user_id), "EXPENSE_UPDATED", { type: "CREATE", groupId: data.group_id, expenseId: expense.id });
            return expense;
        });
    }
    async getExpensesByGroup(groupId, userId) {
        // Check if user is in group
        const member = await database_1.default.groupMember.findUnique({
            where: { group_id_user_id: { group_id: groupId, user_id: userId } },
        });
        if (!member)
            throw new errors_1.ForbiddenError("Access denied");
        return database_1.default.expense.findMany({
            where: { group_id: groupId },
            include: {
                payer: { select: { username: true } },
                splits: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatar_url: true }
                        }
                    }
                },
            },
            orderBy: { created_at: "desc" },
        });
    }
    async getUserExpenses(userId) {
        return database_1.default.expense.findMany({
            where: {
                OR: [
                    { payer_id: userId },
                    { splits: { some: { user_id: userId } } }
                ]
            },
            include: {
                payer: { select: { username: true } },
                group: { select: { name: true } },
                splits: { include: { user: { select: { username: true } } } }
            },
            orderBy: { created_at: "desc" }
        });
    }
    async updateExpense(expenseId, userId, data) {
        return database_1.default.$transaction(async (tx) => {
            // 1. Get existing expense
            const expense = await tx.expense.findUnique({
                where: { id: expenseId },
                include: { splits: true }
            });
            if (!expense)
                throw new errors_1.NotFoundError("Expense not found");
            if (expense.payer_id !== userId)
                throw new errors_1.ForbiddenError("Only the payer can edit this expense");
            // 2. Reverse OLD balances
            await tx.groupMember.update({
                where: { group_id_user_id: { group_id: expense.group_id, user_id: expense.payer_id } },
                data: { balance: { decrement: expense.amount } },
            });
            for (const split of expense.splits) {
                await tx.groupMember.update({
                    where: { group_id_user_id: { group_id: expense.group_id, user_id: split.user_id } },
                    data: { balance: { increment: split.amount_owed } },
                });
            }
            // 3. Calculate NEW splits
            const finalSplits = [];
            const totalAmount = data.amount;
            if (data.split_type === "EQUAL") {
                const count = data.splits.length;
                if (count === 0)
                    throw new errors_1.ValidationError("No members selected for split");
                const part = Math.floor(totalAmount / count);
                const remainder = totalAmount - (part * count);
                data.splits.forEach((s) => {
                    let amount = part;
                    if (s.user_id === expense.payer_id)
                        amount += remainder;
                    finalSplits.push({ user_id: s.user_id, amount_owed: amount });
                });
            }
            else {
                let assignedSum = 0;
                data.splits.forEach((s) => {
                    if (s.user_id !== expense.payer_id) {
                        if (s.amount_owed === undefined)
                            throw new errors_1.ValidationError("Custom split requires amount for each user");
                        assignedSum += s.amount_owed;
                        finalSplits.push({ user_id: s.user_id, amount_owed: s.amount_owed });
                    }
                });
                if (assignedSum > totalAmount)
                    throw new errors_1.ValidationError("Total assigned amount exceeds expense amount");
                finalSplits.push({ user_id: expense.payer_id, amount_owed: totalAmount - assignedSum });
            }
            // 4. Update Expense record
            const updatedExpense = await tx.expense.update({
                where: { id: expenseId },
                data: {
                    amount: totalAmount,
                    description: data.description,
                    split_type: data.split_type,
                    proof_url: data.proof_url !== undefined ? data.proof_url : expense.proof_url,
                    splits: {
                        deleteMany: {},
                        create: finalSplits,
                    },
                },
            });
            // 5. Apply NEW balances
            await tx.groupMember.update({
                where: { group_id_user_id: { group_id: expense.group_id, user_id: expense.payer_id } },
                data: { balance: { increment: totalAmount } },
            });
            for (const split of finalSplits) {
                await tx.groupMember.update({
                    where: { group_id_user_id: { group_id: expense.group_id, user_id: split.user_id } },
                    data: { balance: { decrement: split.amount_owed } },
                });
            }
            // Real-time: Notify all members
            const members = await tx.groupMember.findMany({ where: { group_id: expense.group_id }, select: { user_id: true } });
            (0, socket_1.sendToUsers)(members.map(m => m.user_id), "EXPENSE_UPDATED", { type: "UPDATE", groupId: expense.group_id, expenseId });
            return updatedExpense;
        });
    }
    async remindCreator(expenseId, userId) {
        const expense = await database_1.default.expense.findUnique({
            where: { id: expenseId },
            include: {
                payer: { select: { id: true, username: true } },
                group: { select: { name: true } }
            }
        });
        if (!expense)
            throw new errors_1.NotFoundError("Expense not found");
        if (expense.payer_id === userId)
            throw new errors_1.ValidationError("You cannot remind yourself");
        const reminder = await database_1.default.user.findUnique({ where: { id: userId } });
        if (!reminder)
            throw new errors_1.NotFoundError("User not found");
        const { notificationService } = require("./notification.service");
        await notificationService.createNotification({
            userId: expense.payer_id,
            type: "EXPENSE_REMINDER",
            title: "Yêu cầu xem xét chi tiêu",
            message: `${reminder.username} đã gửi yêu cầu bạn xem xét lại khoản chi "${expense.description || 'Không tên'}" trong nhóm "${expense.group.name}". Có thể có sai sót cần chỉnh sửa.`,
            relatedEntityId: expense.group_id,
        });
        return { success: true };
    }
    async updateProofUrl(expenseId, proofUrl) {
        const existing = await database_1.default.expense.findUnique({
            where: { id: expenseId },
            select: { proof_url: true }
        });
        if (existing?.proof_url && existing.proof_url !== proofUrl) {
            const { storageService } = require("./storage.service");
            await storageService.deleteFileByUrl(existing.proof_url);
        }
        return database_1.default.expense.update({
            where: { id: expenseId },
            data: { proof_url: proofUrl },
        });
    }
    async deleteExpense(expenseId, userId) {
        return database_1.default.$transaction(async (tx) => {
            const expense = await tx.expense.findUnique({
                where: { id: expenseId },
                include: { splits: true }
            });
            if (!expense) {
                throw new errors_1.NotFoundError("Expense not found");
            }
            // Allow the payer or group creator to delete the expense
            // Assuming only payer can delete for now, or check group membership
            // For simplicity, verify payer
            if (expense.payer_id !== userId) {
                throw new errors_1.ForbiddenError("Only the payer can delete this expense");
            }
            // Reverse balances
            await tx.groupMember.update({
                where: {
                    group_id_user_id: { group_id: expense.group_id, user_id: expense.payer_id },
                },
                data: {
                    balance: { decrement: expense.amount },
                },
            });
            for (const split of expense.splits) {
                await tx.groupMember.update({
                    where: {
                        group_id_user_id: { group_id: expense.group_id, user_id: split.user_id },
                    },
                    data: {
                        balance: { increment: split.amount_owed },
                    },
                });
            }
            // Delete splits manually because there's no cascade
            await tx.expenseSplit.deleteMany({
                where: { expense_id: expenseId }
            });
            // Delete expense
            const result = await tx.expense.delete({
                where: { id: expenseId }
            });
            // Cleanup proof image
            if (expense.proof_url) {
                const { storageService } = require("./storage.service");
                await storageService.deleteFileByUrl(expense.proof_url);
            }
            // Real-time
            const members = await tx.groupMember.findMany({ where: { group_id: expense.group_id }, select: { user_id: true } });
            (0, socket_1.sendToUsers)(members.map(m => m.user_id), "EXPENSE_UPDATED", { type: "DELETE", groupId: expense.group_id, expenseId });
            return result;
        });
    }
}
exports.ExpenseService = ExpenseService;
exports.expenseService = new ExpenseService();
