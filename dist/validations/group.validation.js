"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupSchema = exports.transferOwnershipSchema = exports.updateGroupCoverSchema = exports.joinGroupSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Group name is required").max(100),
        member_ids: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.joinGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        inviteCode: zod_1.z.string().min(1, "Invite code is required"),
    }),
});
exports.updateGroupCoverSchema = zod_1.z.object({
    body: zod_1.z.object({
        coverUrl: zod_1.z.string().url("Must be a valid URL"),
    }),
});
exports.transferOwnershipSchema = zod_1.z.object({
    body: zod_1.z.object({
        newOwnerId: zod_1.z.string().min(1, "New owner ID is required"),
    }),
});
exports.updateGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().optional(),
        cover_url: zod_1.z.string().url().optional(),
    }),
});
