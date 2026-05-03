import { generateToken } from "../../lib/utils.js";
import User from "../../models/users/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../../lib/cloudinary.js";

export const signup = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      userName,
      email,
      password: hashedPassword,
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      accessToken: token,
      user: {
        _id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      },
    });
  } catch (error) {
    console.log("Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      accessToken: token,
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.log("Login error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Logged out" });
  } catch (error) {
    console.log("Logout error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const personal_info = async (req, res) => {
  try {
    const { firstName, lastName, dob, gender } = req.body;
    const userId = req.user._id;

    if (!firstName || !lastName || !dob) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.dob = dob;
    user.gender = gender;

    await user.save();

    res.json({
      message: "Personal info updated",
    });
  } catch (error) {
    console.log("Personal info error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic || !profilePic.startsWith("data:image")) {
      return res.status(400).json({
        message: "Invalid image format",
      });
    }

    const upload = await cloudinary.uploader.upload(profilePic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: upload.secure_url },
      { new: true }
    );

    res.json(updatedUser);
  } catch (error) {
    console.log("Update profile error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  res.json(req.user);
};
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserById:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getMe = async (req, res) => {
  try {
    // req.user is already set by your auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Error in getMe:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};