import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../../lib/socket.js";

export const deleteMessage = async (req, res) => {
  try {
    const deleteMessage = req.messages._id;

    if(!deleteMessage){
        return res.status(404).json({ message: "message not found" });
    }
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in deleteMessage: ", error.message);
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