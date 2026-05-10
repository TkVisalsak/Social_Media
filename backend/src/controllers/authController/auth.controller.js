import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
  verifyResetToken,
} from "../../lib/utils.js";
import User from "../../models/usersModel/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../../lib/cloudinary.js";
import getDataUrl from "../../utils/urlGenrator.js";
import TryCatch from "../../utils/Trycatch.js";

const sanitizeUser = (u) => ({
  _id: u._id,
  userName: u.userName,
  email: u.email,
  profilePic: u.profilePic,
  firstName: u.firstName,
  lastName: u.lastName,
  bio: u.bio,
});

export const signup = TryCatch(async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ success: false, message: "Password must be at least 8 characters" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({ userName, email, password: hashedPassword });

  const accessToken = generateAccessToken(newUser._id);
  const refreshToken = generateRefreshToken(newUser._id);

  res.status(201).json({
    success: true,
    accessToken,
    refreshToken,
    user: sanitizeUser(newUser),
  });
});

export const login = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  });
});

export const logout = TryCatch(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ success: true, message: "Logged out" });
});

export const refresh = TryCatch(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }

  if (decoded.type !== "refresh") {
    return res.status(401).json({ success: false, message: "Wrong token type" });
  }

  const user = await User.findById(decoded.userId).select("_id");
  if (!user) {
    return res.status(401).json({ success: false, message: "User no longer exists" });
  }

  const accessToken = generateAccessToken(user._id);
  res.json({ success: true, accessToken });
});

/**
 * Generate a password reset token. In production this token would be
 * emailed to the user (e.g. via SendGrid). For now we log it server-side
 * and return a generic message to prevent account enumeration.
 */
export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const user = await User.findOne({ email }).select("_id");
  if (user) {
    const resetToken = generateResetToken(user._id);
    // TODO: send email with link containing resetToken
    console.log(`[forgotPassword] reset token for ${email}: ${resetToken}`);
  }

  // Always respond 200 — don't leak whether the email exists.
  res.json({
    success: true,
    message: "If that email exists, a reset link has been sent",
  });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Token and new password are required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, message: "Password must be at least 8 characters" });
  }

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired reset token" });
  }

  if (decoded.type !== "reset") {
    return res.status(401).json({ success: false, message: "Wrong token type" });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(decoded.userId, { password: hashed });

  res.json({ success: true, message: "Password reset successful" });
});

export const personal_info = TryCatch(async (req, res) => {
  const { firstName, lastName, dob, gender, bio } = req.body;
  const userId = req.user._id;

  const update = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (dob !== undefined) update.dob = dob;
  if (gender !== undefined) update.gender = gender;
  if (bio !== undefined) update.bio = bio;

  await User.findByIdAndUpdate(userId, update);
  res.json({ success: true, message: "Profile updated" });
});

/**
 * Update profile picture via multipart upload (multer puts the file on
 * `req.file`). Backwards-compatible: if a base64 `profilePic` is sent in
 * the body instead, it still works.
 */
export const updateProfile = TryCatch(async (req, res) => {
  const userId = req.user._id;
  let secureUrl;

  if (req.file) {
    const fileUrl = getDataUrl(req.file);
    const upload = await cloudinary.uploader.upload(fileUrl.content, {
      folder: "profile_pics",
    });
    secureUrl = upload.secure_url;
  } else if (req.body.profilePic && req.body.profilePic.startsWith("data:image")) {
    const upload = await cloudinary.uploader.upload(req.body.profilePic, {
      folder: "profile_pics",
    });
    secureUrl = upload.secure_url;
  } else {
    return res.status(400).json({ success: false, message: "No image provided" });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePic: secureUrl },
    { new: true }
  ).select("-password");

  res.json({ success: true, data: sanitizeUser(updatedUser) });
});

export const checkAuth = (req, res) => {
  res.json({ success: true, data: sanitizeUser(req.user) });
};

export const getUserById = TryCatch(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select("-password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.status(200).json({ success: true, data: sanitizeUser(user) });
});

export const getMe = TryCatch(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.status(200).json({ success: true, data: sanitizeUser(req.user) });
});
