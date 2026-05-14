import express from "express";
import { createStory, getStoriesFeed, getMyStories, viewStory, deleteStory, replyToStory, getStoryViewers } from "../../controllers/storyController/story.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js";

const router = express.Router();

router.post("/", protectRoute, upload.single("file"), createStory);
router.get("/feed", protectRoute, getStoriesFeed);
router.get("/me", protectRoute, getMyStories);
router.post("/view/:storyId", protectRoute, viewStory);
router.post("/:storyId/reply", protectRoute, replyToStory);
router.get("/:storyId/viewers", protectRoute, getStoryViewers);
router.delete("/:storyId", protectRoute, deleteStory);

export default router;