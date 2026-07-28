"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupService = exports.GroupService = void 0;
const database_1 = __importDefault(require("../config/database"));
const errors_1 = require("../utils/errors");
const crypto_1 = __importDefault(require("crypto"));
const socket_1 = require("../socket");
class GroupService {
    async createGroup(name, userId, memberIds = []) {
        const inviteCode = crypto_1.default.randomBytes(4).toString("hex"); // 8 chars
        return database_1.default.$transaction(async (tx) => {
            const group = await tx.group.create({
                data: {
                    name,
                    invite_code: inviteCode,
                    created_by: userId,
                },
            });
            // All users to add (creator + selected members)
            const allMemberIds = Array.from(new Set([userId, ...memberIds]));
            await tx.groupMember.createMany({
                data: allMemberIds.map(id => ({
                    group_id: group.id,
                    user_id: id,
                    balance: 0,
                })),
            });
            // Real-time: Notify members
            (0, socket_1.sendToUsers)(allMemberIds, "GROUP_UPDATED", { type: "CREATE", groupId: group.id });
            return group;
        });
    }
    async joinGroupByCode(inviteCode, userId) {
        const group = await database_1.default.group.findUnique({
            where: { invite_code: inviteCode },
        });
        if (!group) {
            throw new errors_1.NotFoundError("Group not found with this invite code");
        }
        const existingMember = await database_1.default.groupMember.findUnique({
            where: {
                group_id_user_id: {
                    group_id: group.id,
                    user_id: userId,
                },
            },
        });
        if (existingMember) {
            throw new errors_1.ValidationError("You are already a member of this group");
        }
        const newMember = await database_1.default.groupMember.create({
            data: {
                group_id: group.id,
                user_id: userId,
                balance: 0,
            },
        });
        const user = await database_1.default.user.findUnique({ where: { id: userId } });
        if (user) {
            // Notify group creator
            const { notificationService } = require("./notification.service");
            if (group.created_by !== userId) {
                await notificationService.createNotification({
                    userId: group.created_by,
                    type: "GROUP_JOIN",
                    title: "Thành viên mới",
                    message: `${user.username} vừa tham gia vào nhóm "${group.name}".`,
                    relatedEntityId: group.id
                });
            }
        }
        // Real-time: Notify existing members
        const groupMembers = await database_1.default.groupMember.findMany({
            where: { group_id: group.id },
            select: { user_id: true }
        });
        const memberIds = groupMembers.map(m => m.user_id);
        (0, socket_1.sendToUsers)(memberIds, "GROUP_UPDATED", { type: "JOIN", groupId: group.id, userId });
        return newMember;
    }
    async addMemberByIdentifier(groupId, identifier, addedByUserId) {
        const group = await database_1.default.group.findUnique({
            where: { id: groupId },
        });
        if (!group)
            throw new errors_1.NotFoundError("Group not found");
        if (group.deleted_at)
            throw new errors_1.NotFoundError("Nhóm này đã bị xóa hoặc lưu trữ");
        const adderMember = await database_1.default.groupMember.findUnique({
            where: { group_id_user_id: { group_id: groupId, user_id: addedByUserId } }
        });
        if (!adderMember)
            throw new errors_1.ForbiddenError("Bạn không phải thành viên của nhóm này");
        const userToAdd = await database_1.default.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier }
                ]
            }
        });
        if (!userToAdd)
            throw new errors_1.NotFoundError(`Không tìm thấy người dùng: ${identifier}`);
        const existingMember = await database_1.default.groupMember.findUnique({
            where: {
                group_id_user_id: { group_id: groupId, user_id: userToAdd.id },
            },
        });
        if (existingMember)
            throw new errors_1.ValidationError("Người dùng này đã ở trong nhóm");
        const newMember = await database_1.default.groupMember.create({
            data: {
                group_id: groupId,
                user_id: userToAdd.id,
                balance: 0,
            },
        });
        const { notificationService } = require("./notification.service");
        if (group.created_by !== addedByUserId && group.created_by !== userToAdd.id) {
            const adder = await database_1.default.user.findUnique({ where: { id: addedByUserId } });
            await notificationService.createNotification({
                userId: group.created_by,
                type: "GROUP_JOIN",
                title: "Thành viên mới",
                message: `${adder?.username} vừa thêm ${userToAdd.username} vào nhóm "${group.name}".`,
                relatedEntityId: group.id
            });
        }
        const groupMembers = await database_1.default.groupMember.findMany({
            where: { group_id: groupId },
            select: { user_id: true }
        });
        const memberIds = groupMembers.map(m => m.user_id);
        (0, socket_1.sendToUsers)(memberIds, "GROUP_UPDATED", { type: "JOIN", groupId, userId: userToAdd.id });
        return newMember;
    }
    async getGroupsByUser(userId) {
        return database_1.default.group.findMany({
            where: {
                deleted_at: null, // exclude archived groups
                members: {
                    some: { user_id: userId },
                },
            },
            include: {
                _count: {
                    select: { members: true },
                },
                members: {
                    where: { user_id: userId },
                    select: { balance: true }
                }
            },
        });
    }
    async getGroupDetails(groupId, userId) {
        const member = await database_1.default.groupMember.findUnique({
            where: {
                group_id_user_id: {
                    group_id: groupId,
                    user_id: userId,
                },
            },
        });
        if (!member) {
            throw new errors_1.ForbiddenError("You are not a member of this group");
        }
        const group = await database_1.default.group.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true, email: true, avatar_url: true, bank_name: true, account_number: true, account_name: true },
                        },
                    },
                },
            },
        });
        if (group?.deleted_at) {
            throw new errors_1.NotFoundError("Nhóm này đã bị xóa hoặc lưu trữ");
        }
        return group;
    }
    async leaveGroup(groupId, userId) {
        const group = await database_1.default.group.findUnique({
            where: { id: groupId },
            include: { members: { select: { user_id: true, balance: true } } }
        });
        if (!group)
            throw new errors_1.NotFoundError("Không tìm thấy nhóm");
        if (group.deleted_at)
            throw new errors_1.NotFoundError("Nhóm này đã bị lưu trữ");
        const member = group.members.find(m => m.user_id === userId);
        if (!member)
            throw new errors_1.NotFoundError("Bạn không phải thành viên của nhóm này");
        // 1. Balance must be 0
        const balance = member.balance.toNumber();
        if (Math.abs(balance) > 0.01) {
            const absBalance = Math.abs(balance).toLocaleString("vi-VN");
            if (balance < 0) {
                throw new errors_1.ValidationError(`Bạn đang nợ nhóm ${absBalance}đ. Vui lòng thanh toán trước khi rời nhóm.`);
            }
            else {
                throw new errors_1.ValidationError(`Nhóm đang nợ bạn ${absBalance}đ. Vui lòng thu hồi trước khi rời nhóm.`);
            }
        }
        const otherMembers = group.members.filter(m => m.user_id !== userId);
        // 2. Creator-specific rules
        if (group.created_by === userId) {
            if (otherMembers.length > 0) {
                // Still has other members → must transfer ownership first
                throw new errors_1.ValidationError("TRANSFER_REQUIRED:Bạn đang là Chủ nhóm. Vui lòng chọn một thành viên khác làm Chủ nhóm mới trước khi rời đi.");
            }
            // Last member = dissolve group (soft delete)
            await database_1.default.groupMember.delete({
                where: { group_id_user_id: { group_id: groupId, user_id: userId } }
            });
            return database_1.default.group.update({
                where: { id: groupId },
                data: { deleted_at: new Date() }
            });
        }
        // 3. Normal member — just remove from group_members
        return database_1.default.groupMember.delete({
            where: { group_id_user_id: { group_id: groupId, user_id: userId } }
        });
    }
    async transferOwnership(groupId, currentOwnerId, newOwnerId) {
        const group = await database_1.default.group.findUnique({
            where: { id: groupId },
            include: { members: { select: { user_id: true } } }
        });
        if (!group)
            throw new errors_1.NotFoundError("Không tìm thấy nhóm");
        if (group.created_by !== currentOwnerId)
            throw new errors_1.ForbiddenError("Chỉ chủ nhóm mới có thể chuyển quyền sở hữu");
        if (currentOwnerId === newOwnerId)
            throw new errors_1.ValidationError("Bạn đang là chủ nhóm rồi");
        const isNewOwnerMember = group.members.some(m => m.user_id === newOwnerId);
        if (!isNewOwnerMember)
            throw new errors_1.ValidationError("Người được chọn không phải thành viên của nhóm");
        const result = await database_1.default.group.update({
            where: { id: groupId },
            data: { created_by: newOwnerId }
        });
        // Real-time
        const members = await database_1.default.groupMember.findMany({ where: { group_id: groupId }, select: { user_id: true } });
        (0, socket_1.sendToUsers)(members.map(m => m.user_id), "GROUP_UPDATED", { type: "TRANSFER", groupId });
        return result;
    }
    async updateGroupCover(groupId, coverUrl) {
        const existing = await database_1.default.group.findUnique({
            where: { id: groupId },
            select: { qr_code_url: true }
        });
        if (existing?.qr_code_url && existing.qr_code_url !== coverUrl) {
            const { storageService } = require("./storage.service");
            await storageService.deleteFileByUrl(existing.qr_code_url);
        }
        const result = await database_1.default.group.update({
            where: { id: groupId },
            data: { qr_code_url: coverUrl },
        });
        // Real-time
        const members = await database_1.default.groupMember.findMany({ where: { group_id: groupId }, select: { user_id: true } });
        (0, socket_1.sendToUsers)(members.map(m => m.user_id), "GROUP_UPDATED", { type: "COVER_UPDATE", groupId });
        return result;
    }
    async updateGroup(groupId, userId, data) {
        const group = await database_1.default.group.findUnique({
            where: { id: groupId }
        });
        if (!group)
            throw new errors_1.NotFoundError("Group not found");
        if (group.created_by !== userId)
            throw new errors_1.ForbiddenError("Only creator can update group info");
        const result = await database_1.default.group.update({
            where: { id: groupId },
            data
        });
        // Real-time
        const members = await database_1.default.groupMember.findMany({ where: { group_id: groupId }, select: { user_id: true } });
        (0, socket_1.sendToUsers)(members.map(m => m.user_id), "GROUP_UPDATED", { type: "UPDATE", groupId });
        return result;
    }
    async deleteGroup(groupId, userId) {
        const group = await database_1.default.group.findUnique({
            where: { id: groupId },
            include: {
                members: { select: { user_id: true, balance: true } },
                expenses: { select: { proof_url: true } }
            }
        });
        if (!group)
            throw new errors_1.NotFoundError("Không tìm thấy nhóm");
        if (group.created_by !== userId)
            throw new errors_1.ForbiddenError("Chỉ chủ nhóm mới có thể xóa nhóm");
        if (group.deleted_at)
            throw new errors_1.ValidationError("Nhóm này đã bị xóa trước đó");
        // Check ALL members have zero balance
        const unsettledMembers = group.members.filter(m => Math.abs(m.balance.toNumber()) > 0.01);
        if (unsettledMembers.length > 0) {
            throw new errors_1.ValidationError(`Không thể xóa nhóm vì còn ${unsettledMembers.length} thành viên chưa tất toán nợ. Vui lòng giải quyết tất cả khoản nợ trước.`);
        }
        // Soft delete: set deleted_at instead of hard delete
        const result = await database_1.default.group.update({
            where: { id: groupId },
            data: { deleted_at: new Date() }
        });
        // Real-time
        (0, socket_1.sendToUsers)(group.members.map(m => m.user_id), "GROUP_UPDATED", { type: "DELETE", groupId });
        return result;
    }
}
exports.GroupService = GroupService;
exports.groupService = new GroupService();
