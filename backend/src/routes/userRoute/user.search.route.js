import express from "express";
import { searchUsers } from "../../controllers/userController/user.search.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protectRoute, searchUsers);

export default router;
