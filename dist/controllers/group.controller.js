"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnership = exports.deleteGroup = exports.updateGroup = exports.updateGroupCover = exports.leaveGroup = exports.getGroupDetails = exports.getMyGroups = exports.joinGroup = exports.createGroup = void 0;
const group_service_1 = require("../services/group.service");
const error_handler_1 = require("../middleware/error-handler");
exports.createGroup = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { name, member_ids } = req.body;
    const userId = req.user.userId;
    const group = await group_service_1.groupService.createGroup(name, userId, member_ids);
    res.status(201).json(group);
});
exports.joinGroup = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { inviteCode } = req.body;
    const userId = req.user.userId;
    const membership = await group_service_1.groupService.joinGroupByCode(inviteCode, userId);
    res.json(membership);
});
exports.getMyGroups = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const groups = await group_service_1.groupService.getGroupsByUser(userId);
    res.json(groups);
});
exports.getGroupDetails = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const group = await group_service_1.groupService.getGroupDetails(id, userId);
    res.json(group);
});
exports.leaveGroup = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    await group_service_1.groupService.leaveGroup(id, userId);
    res.json({ message: "Left group successfully" });
});
exports.updateGroupCover = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { coverUrl } = req.body;
    if (!coverUrl) {
        res.status(400).json({ message: "coverUrl is required" });
        return;
    }
    const updated = await group_service_1.groupService.updateGroupCover(id, coverUrl);
    res.json({ cover_url: updated.qr_code_url });
});
exports.updateGroup = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const updated = await group_service_1.groupService.updateGroup(id, userId, req.body);
    res.json(updated);
});
exports.deleteGroup = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    await group_service_1.groupService.deleteGroup(id, userId);
    res.json({ message: "Group deleted successfully" });
});
exports.transferOwnership = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const { newOwnerId } = req.body;
    if (!newOwnerId) {
        res.status(400).json({ message: "newOwnerId is required" });
        return;
    }
    const updated = await group_service_1.groupService.transferOwnership(id, userId, newOwnerId);
    res.json({ message: "Ownership transferred successfully", group: updated });
});
