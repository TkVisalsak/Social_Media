import Follow from "../../models/users/follow.model.js";
import User   from "../../models/users/user.model.js";

export const followUser = async (req, res) => {
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
    res.status(500).json({ message: err.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { userId } = req.params;

    const result = await Follow.findOneAndDelete({
      follower: followerId,
      following: userId,
    });

    if (!result) return res.status(404).json({ message: "Not following this user" });

    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const followers = await Follow.find({ following: userId })
      .populate("follower", "userName avatar");  // ✅ lowercase username
    res.json({ followers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const following = await Follow.find({ follower: userId })
      .populate("following", "userName avatar");  // ✅ lowercase username
    res.json({ following });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const checkIfFollowing = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { userId } = req.params;

    const follow = await Follow.findOne({ follower: followerId, following: userId });

    res.json({ following: !!follow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};