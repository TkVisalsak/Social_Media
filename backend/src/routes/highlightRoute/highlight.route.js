import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  getMyHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from "../../controllers/highlightController/highlight.controller.js";

const router = express.Router();

router.get("/", protectRoute, getMyHighlights);
router.post("/", protectRoute, createHighlight);
router.put("/:id", protectRoute, updateHighlight);
router.delete("/:id", protectRoute, deleteHighlight);

export default router;
