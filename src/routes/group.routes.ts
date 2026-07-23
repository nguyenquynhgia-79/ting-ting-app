import { Router } from "express";
import * as groupController from "../controllers/group.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createGroupSchema,
  joinGroupSchema,
  updateGroupCoverSchema,
  transferOwnershipSchema,
  updateGroupSchema,
} from "../validations/group.validation";

const router = Router();
router.use(authenticate);

router.post("/", validateRequest(createGroupSchema), groupController.createGroup);
router.post("/join", validateRequest(joinGroupSchema), groupController.joinGroup);
router.get("/me", groupController.getMyGroups);
router.get("/:id", groupController.getGroupDetails);
router.patch("/:id/cover", validateRequest(updateGroupCoverSchema), groupController.updateGroupCover);
router.patch("/:id/transfer-owner", validateRequest(transferOwnershipSchema), groupController.transferOwnership);
router.patch("/:id", validateRequest(updateGroupSchema), groupController.updateGroup);
router.delete("/:id/leave", groupController.leaveGroup);
router.delete("/:id", groupController.deleteGroup);


export default router;
