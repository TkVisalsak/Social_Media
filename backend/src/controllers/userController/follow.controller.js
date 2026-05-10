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
  const followers = await Follow.find({ following: userId })
    .populate("follower", "userName profilePic firstName lastName");
  res.json({ followers });
});

export const getFollowing = TryCatch(async (req, res) => {
  const { userId } = req.params;
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
