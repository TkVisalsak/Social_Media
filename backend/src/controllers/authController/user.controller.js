import User from "../../models/usersModel/user.model.js";
import Message from "../../models/messagesModel/message.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const deleteMessage = TryCatch(async (req, res) => {
  const messageId = req.messages._id;

  if (!messageId) {
    return res.status(404).json({ message: "message not found" });
  }

  await Message.findByIdAndDelete(messageId);
  res.status(200).json({ message: "Message deleted successfully" });
});

export const getMe = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json({ user });
});
