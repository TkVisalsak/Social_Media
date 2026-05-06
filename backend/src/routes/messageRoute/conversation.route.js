import express from "express";
import {
  getMyConversations,
  getOrCreateDM,
  createGroup,
  getMessages,
} from "../../controllers/messageController/conversation.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/",                   protectRoute, getMyConversations);
router.post("/dm/:userId",        protectRoute, getOrCreateDM);
router.post("/group",             protectRoute, createGroup);
router.get("/:convId/messages",   protectRoute, getMessages);

export default router;