import express from "express";
import { protectRoute as protect } from "../../middleware/auth.middleware.js";
import { getNotifications, markRead, markAllRead } from "../../controllers/notificationController/notification.controller.js";

const router = express.Router();

router.use(protect);

router.get("/",           getNotifications);
router.put("/read-all",   markAllRead);
router.put("/:id/read",   markRead);

export default router;
