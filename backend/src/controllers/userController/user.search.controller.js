import User from "../../models/usersModel/user.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const searchUsers = TryCatch(async (req, res) => {
  const q = (req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  if (!q) {
    return res.status(400).json({ success: false, message: "Query param 'q' is required" });
  }

  const regex = new RegExp(q, "i");

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { userName: regex },
      { firstName: regex },
      { lastName: regex },
    ],
  })
    .select("_id userName firstName lastName profilePic bio")
    .limit(limit)
    .lean();

  res.json({ success: true, data: users });
});
