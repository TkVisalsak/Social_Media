import express from "express";
import {
  createShort,
  addView,
  getShorts,
  getFriendsShorts,
  getAllShortByUserId,
} from "../../controllers/shortController/short.video.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js";

const router = express.Router();

router.post("/createshort", protectRoute, upload.single("video"), createShort);

router.post("/short/:id/viewshort", protectRoute, addView);


router.get("/getallshorts", protectRoute, getShorts);
router.get("/getfriendsshorts", protectRoute, getFriendsShorts);
router.get("/user/:userId", protectRoute, getAllShortByUserId);
export default router;