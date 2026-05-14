import User from "../../models/usersModel/user.model.js";
import TryCatch from "../../utils/Trycatch.js";

// PUT /api/auth/privacy — update privacy settings for the authenticated user
export const updatePrivacy = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { followersListPublic, followingListPublic, savedPostsPublic } = req.body;

  const update = {};
  if (followersListPublic !== undefined) update.followersListPublic = Boolean(followersListPublic);
  if (followingListPublic !== undefined) update.followingListPublic = Boolean(followingListPublic);
  if (savedPostsPublic !== undefined) update.savedPostsPublic = Boolean(savedPostsPublic);

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ success: false, message: "No privacy fields provided" });
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
  if (!updatedUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({
    success: true,
    data: {
      followersListPublic: updatedUser.followersListPublic,
      followingListPublic: updatedUser.followingListPublic,
      savedPostsPublic: updatedUser.savedPostsPublic,
    },
  });
});
