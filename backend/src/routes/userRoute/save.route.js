import express from "express";
import {
  saveItem,
  unsaveItem,
  getSavedItems,
  checkSaved,
} from "../../controllers/userController/save.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, saveItem);
router.delete("/:contentId", protectRoute, unsaveItem);
router.get("/check/:contentId", protectRoute, checkSaved);  // specific before generic
router.get("/:user", getSavedItems);

export default router;
