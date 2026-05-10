import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../../controllers/messageController/message.controller.js";
import { checkAuth } from "../../controllers/authController/auth.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/check", protectRoute, checkAuth);       // specific before /:id
router.get("/:id",   protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

export default router;
