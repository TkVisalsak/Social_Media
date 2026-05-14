import Story        from "../../models/storyModel/story.model.js";
import Follow       from "../../models/usersModel/follow.model.js";
import Conversation from "../../models/messagesModel/conversation.model.js";
import Message      from "../../models/messagesModel/message.model.js";
import { io, getReceiverSocketIds } from "../../socket/socket.js";
import cloudinary from "cloudinary";
import TryCatch from "../../utils/Trycatch.js";
import getDataUrl from "../../utils/urlGenrator.js";

async function areFriends(userA, userB) {
  const a = await Follow.exists({ follower: userA, following: userB });
  const b = await Follow.exists({ follower: userB, following: userA });
  return a && b;
}

export const createStory = TryCatch(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Story must contain media" });
  }

  const fileUrl = getDataUrl(req.file);
  const isVideo = req.file.mimetype.startsWith("video");

  const uploaded = await cloudinary.v2.uploader.upload(fileUrl.content, {
    resource_type: isVideo ? "video" : "image",
    folder: "stories",
  });

  const story = await Story.create({
    userId: req.user._id,
    mediaUrl: [{ type: isVideo ? "video" : "image", url: uploaded.secure_url, publicId: uploaded.public_id }],
    visibility: req.body.visibility || "public",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return res.status(201).json({ message: "Story created", story });
});

export const getStoriesFeed = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const stories = await Story.find()
    .populate("userId", "userName profilePic firstName lastName")
    .sort({ createdAt: -1 });

  const filtered = [];

  for (const story of stories) {
    if (!story.userId) continue;

    const storyOwnerId  = story.userId._id.toString();
    const currentUserId = userId.toString();

    if (storyOwnerId === currentUserId) { filtered.push(story); continue; }
    if (story.visibility === "public")  { filtered.push(story); continue; }

    if (story.visibility === "friends") {
      const isFriend = await areFriends(userId, story.userId._id);
      if (isFriend) filtered.push(story);
    }
  }

  res.json(filtered);
});

export const viewStory = TryCatch(async (req, res) => {
  const userId    = req.user._id;
  const { storyId } = req.params;

  const story = await Story.findById(storyId);
  if (!story) return res.status(404).json({ message: "Story not found" });

  const alreadyViewed = story.viewers.some((v) => v.user.toString() === userId.toString());

  if (!alreadyViewed) {
    story.viewers.push({ user: userId });
    await story.save();
  }

  res.json({ message: "Viewed" });
});

export const getMyStories = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const stories = await Story.find({ userId }).sort({ createdAt: -1 });
  res.json(stories);
});

// POST /api/story/:storyId/reply  — sends a DM to the story owner and returns the conversation
export const replyToStory = TryCatch(async (req, res) => {
  const senderId  = req.user._id;
  const { storyId } = req.params;
  const { text }  = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Reply text is required" });
  }

  const story = await Story.findById(storyId).populate("userId", "userName profilePic");
  if (!story) return res.status(404).json({ message: "Story not found" });

  const ownerId = story.userId._id;

  // Find or create the 1-to-1 conversation between the sender and the story owner.
  let conv = await Conversation.findOne({
    isGroup: false,
    members: { $all: [senderId, ownerId], $size: 2 },
  }).populate("members", "userName profilePic");

  if (!conv) {
    conv = await Conversation.create({ isGroup: false, members: [senderId, ownerId] });
    conv = await conv.populate("members", "userName profilePic");
  }

  // Send the reply as a regular message prefixed with the story context.
  const msgText = `Replied to your story: ${text}`;
  const message = await Message.create({
    conversationId: conv._id,
    senderId,
    text: msgText,
    readBy: [senderId],
  });

  await Conversation.findByIdAndUpdate(conv._id, { lastMessage: message._id });

  const populated = await message.populate("senderId", "userName profilePic");

  // Push via socket if the owner is online.
  getReceiverSocketIds(ownerId).forEach((socketId) => {
    io?.to(socketId).emit("newMessage", populated);
  });

  res.json({ conversation: conv });
});

// GET /api/story/:storyId/viewers — only the story owner can view the list
export const getStoryViewers = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { storyId } = req.params;

  const story = await Story.findById(storyId).populate(
    "viewers.user",
    "userName profilePic"
  );
  if (!story) return res.status(404).json({ message: "Story not found" });

  if (story.userId.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not authorized to view this list" });
  }

  res.json({
    viewers: story.viewers,
    totalViewers: story.viewers.length,
  });
});

export const deleteStory = TryCatch(async (req, res) => {
  const userId    = req.user._id;
  const { storyId } = req.params;

  const story = await Story.findOne({ _id: storyId, userId });
  if (!story) return res.status(404).json({ message: "Not found or unauthorized" });

  for (const m of story.mediaUrl) {
    if (m.publicId) {
      await cloudinary.v2.uploader.destroy(m.publicId, {
        resource_type: m.type === "video" ? "video" : "image",
      });
    }
  }

  await story.deleteOne();
  res.json({ message: "Deleted" });
});
