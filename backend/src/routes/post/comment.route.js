import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";

import {
  createComment,
  getPostComments,
  deleteComment,
  editComment,
} from "../../controllers/post/comment.controller.js";

const router = express.Router();

router.post("/:postId", protectRoute, createComment);
router.get("/:postId", getPostComments);
router.put("/:id", protectRoute, editComment);
router.delete("/:id", protectRoute, deleteComment);

export default router;