import express from "express";
import {
  createShortComment,
  getShortComments,
  deleteShortComment,
  editShortComment,
  replyShortComment,
} from "../../controllers/shortController/short.comment.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:shortId", protectRoute, createShortComment);
router.get("/:shortId", protectRoute, getShortComments);

router.post("/:commentId/reply", protectRoute, replyShortComment);
router.put("/:id", protectRoute, editShortComment);
router.delete("/:id", protectRoute, deleteShortComment);

export default router;