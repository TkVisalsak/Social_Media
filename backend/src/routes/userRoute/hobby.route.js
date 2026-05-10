import express from "express";
import {
  getAllHobbies,
  setMyHobbies,
  getMyHobbies,
  getFriendSuggestions,
} from "../../controllers/userController/hobby.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllHobbies);
router.get("/me", protectRoute, getMyHobbies);
router.post("/me", protectRoute, setMyHobbies);
router.get("/suggestions", protectRoute, getFriendSuggestions);

export default router;
