import express from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";

import {
  checkAuth,
  login,
  logout,
  signup,
  refresh,
  forgotPassword,
  resetPassword,
  updateProfile,
  personal_info,
  getUserById,
  getMe,
} from "../../controllers/authController/auth.controller.js";
import {
  getUserProfile,
  getUserEmail,
  googleCallback,
  oAuthPersonal_info,
} from "../../controllers/authController/google.controller.js";
import { updatePrivacy } from "../../controllers/authController/privacy.controller.js";

import { protectRoute } from "../../middleware/auth.middleware.js";
import { protectAuthRoute } from "../../middleware/oAuth.middleware.js";
import upload from "../../middleware/multer.middleware.js";
import validate from "../../middleware/validate.middleware.js";

const router = express.Router();

// Stricter rate limit for auth endpoints — guards against brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later" },
  validate: { trustProxy: false },
});

// ── Auth ─────────────────────────────────────────────
router.post(
  "/signup",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("userName").trim().notEmpty().withMessage("Username required"),
    body("password").isLength({ min: 8 }).withMessage("Password too short"),
  ],
  validate,
  signup
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  login
);

router.post("/logout", logout);
router.post("/refresh", refresh);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().withMessage("Valid email required")],
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  [
    body("token").notEmpty().withMessage("Token required"),
    body("newPassword").isLength({ min: 8 }).withMessage("Password too short"),
  ],
  validate,
  resetPassword
);

// ── Profile ──────────────────────────────────────────
router.post("/personal_info", protectRoute, personal_info);
router.put(
  "/update-profile",
  protectRoute,
  upload.single("profilePic"),
  updateProfile
);
router.put("/privacy", protectRoute, updatePrivacy);
router.get("/user/:id", getUserById);
router.get("/me", protectRoute, getMe);
router.get("/check", protectRoute, checkAuth);
router.get("/getUserEmail", protectRoute, getUserEmail);

// ── Google OAuth ─────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  googleCallback
);
router.post("/oAuthPersonal_info", protectAuthRoute, oAuthPersonal_info);

export default router;
