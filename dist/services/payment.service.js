"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const database_1 = __importDefault(require("../config/database"));
const errors_1 = require("../utils/errors");
const encryption_util_1 = require("../utils/encryption.util");
class PaymentService {
    /**
     * Create a payment record (Settle Up request)
     */
    async createPayment(data) {
        // Verify both are in the group
        const members = await database_1.default.groupMember.findMany({
            where: {
                group_id: data.group_id,
                user_id: { in: [data.payer_id, data.payee_id] },
            },
        });
        if (members.length < 2) {
            throw new errors_1.AppError("One or both users are not members of this group", 400);
        }
        const payment = await database_1.default.payment.create({
            data: {
                group_id: data.group_id,
                payer_id: data.payer_id,
                payee_id: data.payee_id,
                amount: data.amount,
                status: "PENDING",
            },
            include: {
                payer: { select: { id: true, username: true } },
                payee: { select: { id: true, username: true } },
            },
        });
        const { notificationService } = require("./notification.service");
        await notificationService.createNotification({
            userId: data.payee_id,
            type: "PAYMENT_RECEIVED",
            title: "Nhận tiền thanh toán",
            message: `${payment.payer.username} vừa báo đã trả cho bạn ${data.amount.toLocaleString()}đ. Hãy kiểm tra và xác nhận nhé.`,
            relatedEntityId: payment.group_id, // navigate to group
        });
        return payment;
    }
    /**
     * Confirm a payment (only by the payee)
     */
    async confirmPayment(paymentId, userId) {
        const payment = await database_1.default.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new errors_1.AppError("Payment not found", 404);
        }
        if (payment.status === "COMPLETED") {
            throw new errors_1.AppError("Payment already completed", 400);
        }
        if (payment.payee_id !== userId) {
            throw new errors_1.AppError("Only the recipient can confirm this payment", 403);
        }
        // Atomic update: Mark payment as completed and update balances
        const result = await database_1.default.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: { status: "COMPLETED" },
                include: {
                    payee: { select: { username: true } }
                }
            });
            // Update Payer's balance (they paid back debt, so balance increases)
            await tx.groupMember.update({
                where: {
                    group_id_user_id: {
                        group_id: payment.group_id,
                        user_id: payment.payer_id,
                    },
                },
                data: {
                    balance: { increment: payment.amount },
                },
            });
            // Update Payee's balance (they received money, so balance decreases)
            await tx.groupMember.update({
                where: {
                    group_id_user_id: {
                        group_id: payment.group_id,
                        user_id: payment.payee_id,
                    },
                },
                data: {
                    balance: { decrement: payment.amount },
                },
            });
            return updatedPayment;
        });
        const { notificationService } = require("./notification.service");
        await notificationService.createNotification({
            userId: payment.payer_id,
            type: "PAYMENT_CONFIRMED",
            title: "Thanh toán thành công",
            message: `${result.payee.username} đã xác nhận nhận được ${payment.amount.toLocaleString()}đ từ bạn.`,
            relatedEntityId: payment.group_id, // navigate to group
        });
        return result;
    }
    async rejectPayment(paymentId, userId) {
        const payment = await database_1.default.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new errors_1.AppError("Payment not found", 404);
        }
        if (payment.status !== "PENDING") {
            throw new errors_1.AppError("Only PENDING payments can be rejected", 400);
        }
        if (payment.payee_id !== userId) {
            throw new errors_1.AppError("Only the recipient can reject this payment", 403);
        }
        const updatedPayment = await database_1.default.payment.update({
            where: { id: paymentId },
            data: { status: "REJECTED" },
            include: {
                payee: { select: { username: true } }
            }
        });
        const { notificationService } = require("./notification.service");
        await notificationService.createNotification({
            userId: payment.payer_id,
            type: "PAYMENT_REJECTED",
            title: "Thanh toán bị từ chối",
            message: `${updatedPayment.payee.username} đã từ chối xác nhận khoản thanh toán ${payment.amount.toLocaleString()}đ. Vui lòng kiểm tra lại.`,
            relatedEntityId: payment.group_id,
        });
        return updatedPayment;
    }
    /**
     * Calculate simplified debts for a group
     */
    async getSimplifiedDebts(groupId) {
        const members = await database_1.default.groupMember.findMany({
            where: { group_id: groupId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        bank_name: true,
                        account_number: true,
                        account_name: true
                    }
                }
            },
        });
        const debtors = [];
        const creditors = [];
        members.forEach((m) => {
            const bal = Number(m.balance);
            if (bal < -0.01) {
                debtors.push({ id: m.user_id, username: m.user.username, balance: Math.abs(bal) });
            }
            else if (bal > 0.01) {
                creditors.push({
                    id: m.user_id,
                    username: m.user.username,
                    balance: bal,
                    bank_name: m.user.bank_name,
                    account_number: m.user.account_number ? (0, encryption_util_1.decrypt)(m.user.account_number) : null,
                    account_name: m.user.account_name
                });
            }
        });
        const transactions = [];
        let d = 0;
        let c = 0;
        while (d < debtors.length && c < creditors.length) {
            const debtor = debtors[d];
            const creditor = creditors[c];
            const amount = Math.min(debtor.balance, creditor.balance);
            transactions.push({
                from: debtor.id,
                from_name: debtor.username,
                to: creditor.id,
                to_name: creditor.username,
                amount: Number(amount.toFixed(2)),
                to_bank_name: creditor.bank_name,
                to_account_number: creditor.account_number,
                to_account_name: creditor.account_name
            });
            debtor.balance -= amount;
            creditor.balance -= amount;
            if (debtor.balance < 0.01)
                d++;
            if (creditor.balance < 0.01)
                c++;
        }
        return transactions;
    }
    /**
     * Get payment history for a group
     */
    async getGroupPayments(groupId) {
        return await database_1.default.payment.findMany({
            where: { group_id: groupId },
            orderBy: { created_at: "desc" },
            include: {
                payer: { select: { id: true, username: true } },
                payee: { select: { id: true, username: true } },
            },
        });
    }
    async getUserPayments(userId) {
        return await database_1.default.payment.findMany({
            where: {
                OR: [
                    { payer_id: userId },
                    { payee_id: userId }
                ]
            },
            include: {
                payer: { select: { id: true, username: true } },
                payee: { select: { id: true, username: true } },
                group: { select: { id: true, name: true } }
            },
            orderBy: { created_at: "desc" }
        });
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
