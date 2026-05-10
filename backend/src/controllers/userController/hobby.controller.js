import Hobby from "../../models/usersModel/hobby.model.js";
import User from "../../models/usersModel/user.model.js";
import Follow from "../../models/usersModel/follow.model.js";
import TryCatch from "../../utils/Trycatch.js";

const DEFAULT_HOBBIES = [
  { name: "Animals", emoji: "🐰" },
  { name: "Music", emoji: "🎵" },
  { name: "Sports", emoji: "🏄" },
  { name: "Outdoor activities", emoji: "🚴" },
  { name: "Dancing", emoji: "💃" },
  { name: "Healthy life", emoji: "🥗" },
  { name: "Gym & Fitness", emoji: "🏋️" },
  { name: "Foreign culture", emoji: "👫" },
  { name: "Gaming", emoji: "🎮" },
  { name: "Art", emoji: "🎨" },
  { name: "Writing", emoji: "✍️" },
  { name: "Ceramics", emoji: "🏺" },
  { name: "Cosmos", emoji: "🌌" },
  { name: "Architecture", emoji: "🏛️" },
  { name: "Food", emoji: "🌮" },
  { name: "Planting", emoji: "🪴" },
  { name: "Movie", emoji: "🎬" },
  { name: "Science", emoji: "🔬" },
  { name: "Camping", emoji: "🏕️" },
  { name: "History", emoji: "⛩️" },
  { name: "Design", emoji: "✏️" },
  { name: "Photography", emoji: "📷" },
  { name: "Spirituality", emoji: "🔮" },
  { name: "Yoga", emoji: "🧘" },
  { name: "Book", emoji: "📚" },
  { name: "Cooking", emoji: "🍜" },
];

/**
 * Returns the catalog of hobbies. Seeds the collection from DEFAULT_HOBBIES on
 * first call so the frontend always has something to show.
 */
export const getAllHobbies = TryCatch(async (req, res) => {
  const count = await Hobby.countDocuments();
  if (count === 0) {
    await Hobby.insertMany(DEFAULT_HOBBIES, { ordered: false }).catch(() => {});
  }
  const hobbies = await Hobby.find().sort({ createdAt: 1 });
  res.json({ success: true, hobbies });
});

/**
 * Replace the current user's hobbies with the provided array. Accepts either
 * hobby names or ObjectIds; names are normalized against the catalog so the
 * stored values always match what `getAllHobbies` returns.
 */
export const setMyHobbies = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { hobbies } = req.body;

  if (!Array.isArray(hobbies)) {
    return res
      .status(400)
      .json({ success: false, message: "hobbies must be an array" });
  }

  const cleaned = [...new Set(hobbies.map((h) => String(h).trim()).filter(Boolean))];

  // Resolve any unknown values against the catalog so we don't silently store
  // typos that would break matching later.
  const known = await Hobby.find({ name: { $in: cleaned } }).select("name");
  const knownNames = known.map((h) => h.name);

  await User.findByIdAndUpdate(userId, { hobbies: knownNames });

  res.json({ success: true, hobbies: knownNames });
});

export const getMyHobbies = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).select("hobbies");
  res.json({ success: true, hobbies: user?.hobbies || [] });
});

/**
 * Friend suggestions based on hobby overlap. Returns users that share at least
 * `minMatches` (default 3) hobbies with the current user, excluding self and
 * anyone already followed. Sorted by overlap count desc.
 */
export const getFriendSuggestions = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const minMatches = Math.max(1, parseInt(req.query.min, 10) || 3);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  const me = await User.findById(userId).select("hobbies");
  const myHobbies = me?.hobbies || [];

  if (myHobbies.length < minMatches) {
    return res.json({
      success: true,
      minMatches,
      myHobbyCount: myHobbies.length,
      suggestions: [],
      message: `Pick at least ${minMatches} hobbies to get suggestions`,
    });
  }

  const followingDocs = await Follow.find({ follower: userId }).select("following");
  const excludeIds = followingDocs.map((f) => f.following);
  excludeIds.push(userId);

  const suggestions = await User.aggregate([
    {
      $match: {
        _id: { $nin: excludeIds },
        hobbies: { $in: myHobbies },
      },
    },
    {
      $addFields: {
        matchCount: {
          $size: { $setIntersection: ["$hobbies", myHobbies] },
        },
      },
    },
    { $match: { matchCount: { $gte: minMatches } } },
    { $sort: { matchCount: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        password: 0,
        __v: 0,
      },
    },
  ]);

  res.json({
    success: true,
    minMatches,
    count: suggestions.length,
    suggestions,
  });
});
