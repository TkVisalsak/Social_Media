import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  toggleShortLike,
  getShortLikeStatus,
  incrementShortShare,
} from "../../controllers/shortController/short.like.controller.js";

const router = express.Router();
 
router.post("/:id/likeshort", protectRoute, toggleShortLike);
router.post("/:id/shareshort", protectRoute, incrementShortShare);
router.get("/:id/shortlike-status", protectRoute, getShortLikeStatus);

export default router;