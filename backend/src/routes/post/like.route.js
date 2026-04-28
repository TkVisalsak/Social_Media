import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";

import {
  toggleLike,
  getPostLikes,
  checkUserLike,
} from "../../controllers/post/like.controller.js";

const router = express.Router();

 
router.post("/:id", protectRoute, toggleLike);

 
router.get("/:id/count", getPostLikes);

 
router.get("/:id/check", protectRoute, checkUserLike);

export default router;