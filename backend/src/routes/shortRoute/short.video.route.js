import express from "express";
import {
  createShort,
  addView,
  getShorts,
} from "../../controllers/shortController/short.video.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/multer.middleware.js";

const router = express.Router();
 
router.post("/createshort", protectRoute, upload.single("video"), createShort);
 
router.post("/short/:id/viewshort", protectRoute, addView);


router.get("/getallshorts", protectRoute, getShorts);
export default router;