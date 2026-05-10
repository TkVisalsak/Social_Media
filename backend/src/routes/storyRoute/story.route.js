import express from "express";
import {createStory, getStoriesFeed, getMyStories, viewStory, deleteStory} from "../../controllers/storyController/story.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js"; 
const router = express.Router();



router.post("/", protectRoute, upload.single("file"),createStory);
router.get("/feed", protectRoute, getStoriesFeed);
router.get("/me", protectRoute, getMyStories);
router.post("/view/:storyId", protectRoute, viewStory);
router.delete("/:storyId", protectRoute, deleteStory);

export default router;