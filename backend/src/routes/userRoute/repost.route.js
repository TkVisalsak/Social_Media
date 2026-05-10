import express from "express";
import { createRepost, getContentReposts, getUserReposts, deleteRepost } from "../../controllers/userController/repost.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/feed", protectRoute, createRepost);
router.post("/short", protectRoute, createRepost);
router.get("/user/:userId", getUserReposts);
router.delete("/:id", protectRoute, deleteRepost);

export default router;

