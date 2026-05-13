import mongoose from "mongoose";
import cloudinary from "cloudinary";

import Feed from "../../models/feedModel/feed.model.js";
import Follow from "../../models/usersModel/follow.model.js";
import Like from "../../models/feedModel/feed.like.model.js";
import TryCatch from "../../utils/Trycatch.js";
import getDataUrl from "../../utils/urlGenrator.js";

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */

export const createFeed = TryCatch(async (req, res) => {
  const { caption, visibility, hashtags, location } = req.body;
  const userId = req.user._id;

  let media = [];

  if (req.file) {
    const fileUrl = getDataUrl(req.file);
    const isVideo = req.file.mimetype.startsWith("video");
    const uploaded = await cloudinary.v2.uploader.upload(fileUrl.content, {
      resource_type: isVideo ? "video" : "image",
      folder: "feeds",
    });
    media = [
      {
        type: isVideo ? "video" : "image",
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    ];
  }

  let parsedHashtags = [];
  if (hashtags) {
    try {
      parsedHashtags = Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags);
    } catch {
      parsedHashtags = hashtags
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
    }
  }

  const feed = await Feed.create({
    userId,
    caption,
    visibility: visibility || "public",
    hashtags: parsedHashtags,
    location,
    media,
  });

  res.status(201).json({ message: "Feed created", data: feed });
});

/* -------------------------------------------------------------------------- */
/*                              GET USER FEED                                 */
/* -------------------------------------------------------------------------- */

/**
 * GET user feed (IG-style) with randomization + friend-of-friend discovery.
 *
 * Visibility enum:
 *   - 'public'    -> anyone
 *   - 'followers' -> only people who follow the author
 *   - 'friends'   -> only mutual follows
 *   - 'private'   -> only the author (excluded from feeds)
 *
 * Two buckets merged:
 *   A. PRIMARY   -> visibility-filtered posts
 *   B. DISCOVERY -> public posts from friend-of-friend authors (~20% of feed)
 */
export const getUserFeed = TryCatch(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const me = new mongoose.Types.ObjectId(userId);

  // ---------- 1. Build relationship sets ----------

  // People I follow
  const iFollowDocs = await Follow.find({ follower: me })
    .select("following")
    .lean();
  const followingIds = iFollowDocs.map((d) => d.following);

  // People who follow me
  const followMeDocs = await Follow.find({ following: me })
    .select("follower")
    .lean();
  const followerSet = new Set(followMeDocs.map((d) => d.follower.toString()));

  // Mutual friends = I follow them AND they follow me
  const mutualFriendIds = followingIds.filter((id) =>
    followerSet.has(id.toString())
  );

  // For "isFollowed" flag + FoF exclusion list
  const followingSet = new Set(followingIds.map((id) => id.toString()));
  followingSet.add(userId.toString());

  // Friend-of-friend candidates: authors my mutual friends follow
  // (excluding myself and people I already follow)
  let fofIds = [];
  if (mutualFriendIds.length > 0) {
    const fofDocs = await Follow.find({
      follower: { $in: mutualFriendIds },
    })
      .select("following")
      .lean();

    const fofSet = new Set();
    fofDocs.forEach((d) => {
      const idStr = d.following.toString();
      if (!followingSet.has(idStr)) fofSet.add(idStr);
    });
    fofIds = Array.from(fofSet).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
  }

  // ---------- 2. Setup ----------
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ~20% discovery, capped at 5
  const discoveryLimit = Math.min(
    Math.ceil(limit * 0.2),
    fofIds.length > 0 ? 5 : 0
  );
  const primaryLimit = limit - discoveryLimit;

  // ---------- 3. PRIMARY bucket ----------
  const primaryPosts = await Feed.aggregate([
    {
      $match: {
        userId: { $ne: me },
        visibility: { $in: ["public", "followers", "friends"] },
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              userName: 1,
              profilePic: 1,
              firstName: 1,
              lastName: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$author" },

    // Visibility gate
    {
      $match: {
        $expr: {
          $switch: {
            branches: [
              { case: { $eq: ["$visibility", "public"] }, then: true },
              {
                case: { $eq: ["$visibility", "followers"] },
                then: { $in: ["$userId", followingIds] },
              },
              {
                case: { $eq: ["$visibility", "friends"] },
                then: { $in: ["$userId", mutualFriendIds] },
              },
            ],
            default: false,
          },
        },
      },
    },

    // Relevance score with randomness
    {
      $addFields: {
        source: "primary",
        relevanceScore: {
          $add: [
            { $cond: [{ $in: ["$userId", followingIds] }, 100, 0] },
            { $ifNull: ["$likesCount", 0] },
            { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 2] },
            {
              $divide: [
                { $subtract: ["$createdAt", sevenDaysAgo] },
                1000 * 60 * 60,
              ],
            },
            { $multiply: [{ $rand: {} }, 50] },
          ],
        },
      },
    },

    { $sort: { relevanceScore: -1 } },
    { $skip: skip },
    { $limit: primaryLimit },
  ]);

  // ---------- 4. DISCOVERY bucket (FoF public posts) ----------
  let discoveryPosts = [];
  if (discoveryLimit > 0 && fofIds.length > 0) {
    discoveryPosts = await Feed.aggregate([
      {
        $match: {
          userId: { $in: fofIds },
          visibility: "public",
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      { $sample: { size: discoveryLimit * 3 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "author",
          pipeline: [
            {
              $project: {
                userName: 1,
                profilePic: 1,
                firstName: 1,
                lastName: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$author" },
      {
        $addFields: {
          source: "discovery",
          relevanceScore: { $multiply: [{ $rand: {} }, 100] },
        },
      },
      { $sort: { relevanceScore: -1 } },
      { $limit: discoveryLimit },
    ]);
  }

  // ---------- 5. isLiked flag (one query for the page) ----------
  const allPosts = [...primaryPosts, ...discoveryPosts];
  const postIds = allPosts.map((p) => p._id);

  const myLikes = await Like.find({
    userId: me,
    feedId: { $in: postIds },
  })
    .select("feedId")
    .lean();

  const likedSet = new Set(myLikes.map((l) => l.feedId.toString()));

  // ---------- 6. Shape response ----------
  const shaped = allPosts.map((post) => {
    const fullName = `${post.author.firstName || ""} ${
      post.author.lastName || ""
    }`.trim();

    return {
      _id: post._id,
      caption: post.caption,
      media: post.media,
      location: post.location,
      hashtags: post.hashtags,
      visibility: post.visibility,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isEdited: post.isEdited,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        _id: post.author._id,
        userName: post.author.userName,
        profilePic: post.author.profilePic,
        fullName,
      },
      isLiked: likedSet.has(post._id.toString()),
      isFollowed: followingSet.has(post.author._id.toString()),
      source: post.source, // 'primary' | 'discovery'
    };
  });

  // ---------- 7. Interleave ----------
  const finalFeed = interleaveWithBias(shaped);

  return res.status(200).json({
    success: true,
    data: finalFeed,
    pagination: {
      page,
      limit,
      hasMore: finalFeed.length === limit,
    },
  });
});

/**
 * Interleave primary + discovery posts:
 *   - light shuffle on primary so order varies between refreshes
 *   - discovery posts inserted at random positions (never slot 0)
 */
const interleaveWithBias = (array) => {
  const primary = array.filter((p) => p.source === "primary");
  const discovery = array.filter((p) => p.source === "discovery");

  // Light shuffle on primary
  for (let i = primary.length - 1; i > 0; i--) {
    const maxSwap = Math.min(3, i);
    const j = Math.max(0, i - Math.floor(Math.random() * (maxSwap + 1)));
    [primary[i], primary[j]] = [primary[j], primary[i]];
  }

  // Insert discovery posts at random positions, never at the very top
  const result = [...primary];
  discovery.forEach((post) => {
    const minPos = 1;
    const maxPos = result.length;
    const pos = minPos + Math.floor(Math.random() * (maxPos - minPos + 1));
    result.splice(pos, 0, post);
  });

  // Strip internal `source` field before returning
  return result.map(({ source, ...rest }) => rest);
};

/* -------------------------------------------------------------------------- */
/*                            GET POSTS BY USER                               */
/* -------------------------------------------------------------------------- */

export const getUserPosts = TryCatch(async (req, res) => {
  const { userId } = req.params;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip  = (page - 1) * limit;

  const posts = await Feed.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "userName profilePic firstName lastName")
    .lean();

  const shaped = posts.map(({ userId: u, ...rest }) => ({ ...rest, user: u }));

  res.json({ success: true, data: shaped });
});

/* -------------------------------------------------------------------------- */
/*                                GET BY ID                                   */
/* -------------------------------------------------------------------------- */

export const getFeedById = TryCatch(async (req, res) => {
  const feed = await Feed.findById(req.params.id).populate(
    "userId",
    "userName profilePic firstName lastName"
  );

  if (!feed) {
    return res.status(404).json({ message: "Feed not found" });
  }

  const liked = await Like.exists({
    userId: req.user._id,
    feedId: feed._id,
  });

  res.json({
    message: "Feed fetched successfully",
    data: { ...feed.toObject(), isLiked: !!liked },
  });
});

/* -------------------------------------------------------------------------- */
/*                                  DELETE                                    */
/* -------------------------------------------------------------------------- */

export const deleteFeed = TryCatch(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (!feed) {
    return res.status(404).json({ message: "Feed not found" });
  }

  if (feed.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  for (const item of feed.media) {
    if (!item.publicId) continue;
    await cloudinary.v2.uploader.destroy(item.publicId, {
      resource_type: item.type === "video" ? "video" : "image",
    });
  }

  await feed.deleteOne();

  res.json({ message: "Feed deleted" });
});

/* -------------------------------------------------------------------------- */
/*                              UPDATE CAPTION                                */
/* -------------------------------------------------------------------------- */

export const updateCaption = TryCatch(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (!feed) {
    return res.status(404).json({ message: "Feed not found" });
  }

  if (feed.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  feed.caption = req.body.caption || feed.caption;
  feed.isEdited = true;

  await feed.save();

  res.json({ message: "Caption updated", data: feed });
});