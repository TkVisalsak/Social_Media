import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js";

import {
  createFeed,
  getUserFeed,
  getUserPosts,
  getFeedById,
  deleteFeed,
  updateCaption,
} from "../../controllers/feedController/feed.controller.js";

const router = express.Router();

 
router.post(
  "/",
  protectRoute,
  upload.single("file"),
  createFeed
);

 
router.get("/", protectRoute, getUserFeed);
router.get("/user/:userId", protectRoute, getUserPosts);

 
router.get("/:id", protectRoute, getFeedById);

 
router.put("/:id", protectRoute, updateCaption);
 
router.delete("/:id", protectRoute, deleteFeed);


export default router;