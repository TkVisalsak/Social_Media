import Story    from "../../models/storyModel/story.model.js";
import Follow   from "../../models/usersModel/follow.model.js";
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
