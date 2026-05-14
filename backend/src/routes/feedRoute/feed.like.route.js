import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";

import {
  toggleLike,
  getFeedLikes,
  checkUserLike,
  incrementShareCount,
} from "../../controllers/feedController/feed.like.controller.js";

const router = express.Router();

 
router.post("/:id", protectRoute, toggleLike);

 
router.get("/:id/count", getFeedLikes);


router.get("/:id/check", protectRoute, checkUserLike);

// Share count
router.post("/:id/share", protectRoute, incrementShareCount);

export default router;