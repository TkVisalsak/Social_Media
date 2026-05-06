import express from "express";
import {
  saveItem,
  unsaveItem,
  getSavedItems,
  checkSaved,
} from "../../controllers/userController/save.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

// save item
router.post("/", protectRoute, saveItem);

// remove saved item
router.delete("/:itemId", protectRoute, unsaveItem);

// get all saved
router.get("/", protectRoute, getSavedItems);

// check saved status
router.get("/check/:itemId", protectRoute, checkSaved);

export default router;