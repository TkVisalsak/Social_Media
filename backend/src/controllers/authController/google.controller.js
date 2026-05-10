import OAuthUser from "../../models/oAuth.model.js";
import { generateAccessToken } from "../../lib/utils.js";

export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: "Authentication failed. No user returned from Passport." });
    }

    const user = req.user;
    const token = generateAccessToken(user._id);

    const existingUser = await OAuthUser.findById(user._id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isProfileComplete =
      existingUser.firstName && existingUser.lastName && existingUser.dob && existingUser.gender;

    const baseUrl =
      process.env.FRONTEND_URL || "http://127.0.0.1:5500/frontend/public";
    const next = isProfileComplete ? "main.html" : "google-info.html";
    res.redirect(`${baseUrl}/${next}?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: "Internal server error in callback" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await OAuthUser.findById(userId).select(
      "email userName displayName profilePic"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserEmail = async (req, res) => {
  try {
    res.status(200).json({
      email: req.user.email,
      userName: req.user.userName,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const oAuthPersonal_info = async (req, res) => {
  const { firstName, lastName, dob, gender } = req.body;
  const userId = req.user._id;

  try {
    if (!firstName || !lastName || !dob) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await OAuthUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.dob = dob;
    user.gender = gender;

    await user.save();

    res.status(200).json({ message: "Personal information updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
