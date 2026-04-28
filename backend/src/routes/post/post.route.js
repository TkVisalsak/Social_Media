import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js";

import {
  createPost,
  getFeedPosts,
  getPostById,
  deletePost,
  updateCaption,
} from "../../controllers/post/post.controller.js";

const router = express.Router();

 
router.post(
  "/",
  protectRoute,
  upload.single("file"),
  createPost
);

 
router.get("/", protectRoute, getFeedPosts);

 
router.get("/:id", protectRoute, getPostById);

 
router.put("/:id", protectRoute, updateCaption);
 
router.delete("/:id", protectRoute, deletePost);


export default router;