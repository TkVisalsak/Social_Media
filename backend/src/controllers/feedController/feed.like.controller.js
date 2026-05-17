import Like from "../../models/feedModel/feed.like.model.js";
import Feed from "../../models/feedModel/feed.model.js";
import TryCatch from "../../utils/Trycatch.js";
import { createNotification } from "../notificationController/notification.controller.js";

//like and unlike feed
export const toggleLike = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const feedId = req.params.id;

  const feed = await Feed.findById(feedId);
  if (!feed) {
    return res.status(404).json({ message: "Feed not found" });
  }

  const deleted = await Like.findOneAndDelete({ userId, feedId });

  // If something was deleted → it was liked → now unliked
  if (deleted) {
    await Feed.findByIdAndUpdate(feedId, { $inc: { likesCount: -1 } });
    return res.json({
      message: "Unliked",
      liked: false,
    });
  }

  // Otherwise → create like
  try {
    await Like.create({ userId, feedId });
    await Feed.findByIdAndUpdate(feedId, { $inc: { likesCount: 1 } });

    // Notify the post owner (skip if liker == owner)
    createNotification({
      recipient:  feed.userId,
      actor:      userId,
      type:       "like",
      targetId:   feedId,
      targetType: "feed",
    }).catch(() => {});

    return res.json({
      message: "Liked",
      liked: true,
    });
  } catch (err) {
    // Handle race condition safely
    if (err.code === 11000) {
      return res.json({
        message: "Already liked",
        liked: true,
      });
    }
    throw err;
  }
});
export const getFeedLikes = TryCatch(async (req, res) => {
  const feedId = req.params.id;

  const count = await Like.countDocuments({ feedId });

  res.json({
    feedId,
    likes: count,
  });
});
export const checkUserLike = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const feedId = req.params.id;

  const liked = await Like.findOne({
    userId,
    feedId,
  });

  res.json({
    liked: !!liked,
  });
});

export const incrementShareCount = TryCatch(async (req, res) => {
  const feedId = req.params.id;

  const feed = await Feed.findByIdAndUpdate(
    feedId,
    { $inc: { sharesCount: 1 } },
    { new: true }
  );

  if (!feed) {
    return res.status(404).json({ message: "Feed not found" });
  }

  res.json({ sharesCount: feed.sharesCount });
});