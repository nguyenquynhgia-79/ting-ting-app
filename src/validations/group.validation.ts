import { z } from "zod";

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Group name is required").max(100),
    member_ids: z.array(z.string()).optional(),
  }),
});

export const joinGroupSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, "Invite code is required"),
  }),
});

export const updateGroupCoverSchema = z.object({
  body: z.object({
    coverUrl: z.string().url("Must be a valid URL"),
  }),
});

export const transferOwnershipSchema = z.object({
  body: z.object({
    newOwnerId: z.string().min(1, "New owner ID is required"),
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    cover_url: z.string().url().optional(),
  }),
});
