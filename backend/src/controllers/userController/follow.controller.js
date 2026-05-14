import Follow from "../../models/usersModel/follow.model.js";
import User   from "../../models/usersModel/user.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const followUser = async (req, res, next) => {
  try {
    const followerId = req.user._id;
    const { userId } = req.params;

    if (followerId.toString() === userId.toString()) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) return res.status(404).json({ message: "User not found" });

    const follow = await Follow.create({ follower: followerId, following: userId });
    res.status(201).json({ message: "Followed successfully", follow });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already following" });
    }
    next(err);
  }
};

export const unfollowUser = TryCatch(async (req, res) => {
  const followerId = req.user._id;
  const { userId } = req.params;

  const result = await Follow.findOneAndDelete({ follower: followerId, following: userId });
  if (!result) return res.status(404).json({ message: "Not following this user" });

  res.json({ message: "Unfollowed successfully" });
});

export const getFollowers = TryCatch(async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user._id;

  // Privacy check: only enforce when the requester is not the owner
  if (requesterId.toString() !== userId.toString()) {
    const targetUser = await User.findById(userId).select("followersListPublic");
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.followersListPublic === false) {
      return res.status(403).json({ message: "This list is private" });
    }
  }

  const followers = await Follow.find({ following: userId })
    .populate("follower", "userName profilePic firstName lastName");
  res.json({ followers });
});

export const getFollowing = TryCatch(async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user._id;

  // Privacy check: only enforce when the requester is not the owner
  if (requesterId.toString() !== userId.toString()) {
    const targetUser = await User.findById(userId).select("followingListPublic");
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.followingListPublic === false) {
      return res.status(403).json({ message: "This list is private" });
    }
  }

  const following = await Follow.find({ follower: userId })
    .populate("following", "userName profilePic firstName lastName");
  res.json({ following });
});

export const checkIfFollowing = TryCatch(async (req, res) => {
  const followerId = req.user._id;
  const { userId } = req.params;

  const follow = await Follow.findOne({ follower: followerId, following: userId });
  res.json({ following: !!follow });
});

// GET /api/follow/not-following-back — people who follow me but I don't follow back
export const getNotFollowingBack = TryCatch(async (req, res) => {
  const myId = req.user._id;

  // People who follow me
  const myFollowers = await Follow.find({ following: myId })
    .populate("follower", "userName profilePic firstName lastName")
    .lean();

  // IDs of people I follow
  const iFollow = await Follow.find({ follower: myId }).lean();
  const iFollowIds = new Set(iFollow.map(f => f.following.toString()));

  // Return followers I don't follow back
  const notFollowingBack = myFollowers
    .filter(f => !iFollowIds.has(f.follower._id.toString()))
    .map(f => f.follower);

  res.json({ users: notFollowingBack });
});
