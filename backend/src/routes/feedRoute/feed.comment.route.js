import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";

import {
  createComment,
  getFeedComments,
  deleteComment,
  editComment,
} from "../../controllers/feedController/feed.comment.controller.js";

const router = express.Router();

router.post("/:feedId", protectRoute, createComment);
router.get("/:feedId", getFeedComments);
router.put("/:id", protectRoute, editComment);
router.delete("/:id", protectRoute, deleteComment);

export default router;