import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  toggleShortLike,
  getShortLikeStatus,
} from "../../controllers/shortController/short.like.controller.js";

const router = express.Router();
 
router.post("/:id/likeshort", protectRoute, toggleShortLike);
 
router.get("/:id/shortlike-status", protectRoute, getShortLikeStatus);

export default router;