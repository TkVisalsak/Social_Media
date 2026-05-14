import User from "../../models/usersModel/user.model.js";
import Message from "../../models/messagesModel/message.model.js";
import Conversation from "../../models/messagesModel/conversation.model.js";
import Follow from "../../models/usersModel/follow.model.js";
import cloudinary from "../../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../../socket/socket.js";
import TryCatch from "../../utils/Trycatch.js";

async function areFriends(userA, userB) {
  const [a, b] = await Promise.all([
    Follow.exists({ follower: userA, following: userB }),
    Follow.exists({ follower: userB, following: userA }),
  ]);
  return a && b;
}

/**
 * Sidebar users (paginated). Returns users the caller could DM.
 */
export const getUsersForSidebar = TryCatch(async (req, res) => {
  const loggedInUserId = req.user._id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({ _id: { $ne: loggedInUserId } })
      .select("userName profilePic firstName lastName")
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ _id: { $ne: loggedInUserId } }),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: { page, limit, total, hasMore: skip + users.length < total },
  });
});

/**
 * Get the 1-to-1 conversation between caller and `:id`, then return its
 * messages. Backed by the Conversation model — matches the schema.
 */
export const getMessages = TryCatch(async (req, res) => {
  const { id: otherUserId } = req.params;
  const myId = req.user._id;

  const conversation = await Conversation.findOne({
    isGroup: false,
    members: { $all: [myId, otherUserId], $size: 2 },
  });

  if (!conversation) {
    return res.status(200).json({ success: true, data: [] });
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .populate("senderId", "userName profilePic")
    .lean();

  res.status(200).json({ success: true, data: messages });
});

/**
 * Send a DM. Creates the 1-to-1 conversation on first message, then writes
 * the message and pushes it to all of the receiver's open sockets.
 */
export const sendMessage = TryCatch(async (req, res) => {
  const { text, image } = req.body;
  const { id: receiverId } = req.params;
  const senderId = req.user._id;

  if (!text && !image) {
    return res.status(400).json({ success: false, message: "Empty message" });
  }

  let imageUrl;
  if (image) {
    const uploadResponse = await cloudinary.uploader.upload(image);
    imageUrl = uploadResponse.secure_url;
  }

  // Find or create the 1-to-1 conversation.
  let conversation = await Conversation.findOne({
    isGroup: false,
    members: { $all: [senderId, receiverId], $size: 2 },
  });
  if (!conversation) {
    conversation = await Conversation.create({
      isGroup: false,
      members: [senderId, receiverId],
    });
  }

  // Non-mutual: allow only 1 message until the other person replies.
  const mutual = await areFriends(senderId, receiverId);
  if (!mutual) {
    const [myCount, theirCount] = await Promise.all([
      Message.countDocuments({ conversationId: conversation._id, senderId }),
      Message.countDocuments({ conversationId: conversation._id, senderId: { $ne: senderId } }),
    ]);
    if (myCount >= 1 && theirCount === 0) {
      return res.status(403).json({
        success: false,
        message: "Waiting for reply before you can send more messages",
      });
    }
  }

  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    text,
    image: imageUrl,
    readBy: [senderId],
  });

  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: newMessage._id,
  });

  const populated = await newMessage.populate(
    "senderId",
    "userName profilePic"
  );

  const socketIds = getReceiverSocketIds(receiverId);
  socketIds.forEach((socketId) => {
    io?.to(socketId).emit("newMessage", populated);
  });

  res.status(201).json({ success: true, data: populated });
});
