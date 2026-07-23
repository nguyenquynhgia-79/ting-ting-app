import { Request, Response } from "express";
import { groupService } from "../services/group.service";
import { asyncHandler } from "../middleware/error-handler";

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, member_ids } = req.body;
  const userId = req.user!.userId;
  const group = await groupService.createGroup(name, userId, member_ids);
  res.status(201).json(group);
});

export const joinGroup = asyncHandler(async (req: Request, res: Response) => {
  const { inviteCode } = req.body;
  const userId = req.user!.userId;
  const membership = await groupService.joinGroupByCode(inviteCode, userId);
  res.json(membership);
});

export const getMyGroups = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const groups = await groupService.getGroupsByUser(userId);
  res.json(groups);
});

export const getGroupDetails = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const group = await groupService.getGroupDetails(id, userId);
  res.json(group);
});

export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  await groupService.leaveGroup(id, userId);
  res.json({ message: "Left group successfully" });
});

export const updateGroupCover = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { coverUrl } = req.body;
  if (!coverUrl) {
    res.status(400).json({ message: "coverUrl is required" });
    return;
  }
  const updated = await groupService.updateGroupCover(id, coverUrl);
  res.json({ cover_url: updated.qr_code_url });
});

export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const updated = await groupService.updateGroup(id, userId, req.body);
  res.json(updated);
});

export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  await groupService.deleteGroup(id, userId);
  res.json({ message: "Group deleted successfully" });
});

export const transferOwnership = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const { newOwnerId } = req.body;
  if (!newOwnerId) {
    res.status(400).json({ message: "newOwnerId is required" });
    return;
  }
  const updated = await groupService.transferOwnership(id, userId, newOwnerId);
  res.json({ message: "Ownership transferred successfully", group: updated });
});
