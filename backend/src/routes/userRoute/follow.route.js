import express from "express";
import { followUser, getFollowers, getFollowing, unfollowUser, checkIfFollowing } from "../../controllers/userController/follow.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:userId",              protectRoute, followUser);
router.delete("/unfollow/:userId",   protectRoute, unfollowUser);
router.get("/followers/:userId",     protectRoute, getFollowers);
router.get("/following/:userId",     protectRoute, getFollowing);
router.get("/check/:userId",         protectRoute, checkIfFollowing);

export default router;
