import Repost from "../../models/usersModel/repost.model.js";
import Feed   from "../../models/feedModel/feed.model.js";
import Short  from "../../models/shortvideosModel/short.video.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const createRepost = async (req, res, next) => {
  try {
    const { contentId, contentType, caption, visibility } = req.body;
    const userId = req.user._id;

    if (!contentId || !contentType) {
      return res.status(400).json({ message: "contentId and contentType are required" });
    }
    if (!["feed", "short"].includes(contentType)) {
      return res.status(400).json({ message: "contentType must be 'feed' or 'short'" });
    }

    const ContentModel = contentType === "feed" ? Feed : Short;
    const original = await ContentModel.findById(contentId);
    if (!original) {
      return res.status(404).json({ message: `${contentType} not found` });
    }

    const repost = await Repost.create({
      userId,
      contentType,
      contentId,
      caption: caption || "",
      visibility: visibility || original.visibility || "public",
    });

    await ContentModel.findByIdAndUpdate(contentId, { $inc: { sharesCount: 1 } }, { new: true });

    res.status(201).json({ success: true, data: repost });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You already reposted this content" });
    }
    next(error);
  }
};

export const deleteRepost = TryCatch(async (req, res) => {
  const repost = await Repost.findOne({ _id: req.params.id, userId: req.user._id });
  if (!repost) {
    return res.status(404).json({ message: "Repost not found or not yours" });
  }

  const ContentModel = repost.contentType === "feed" ? Feed : Short;
  await ContentModel.findByIdAndUpdate(repost.contentId, { $inc: { sharesCount: -1 } });
  await repost.deleteOne();

  res.status(200).json({ success: true, message: "Repost removed" });
});

export const getUserReposts = TryCatch(async (req, res) => {
  const { userId } = req.params;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;
  const shouldPopulate = req.query.populate === "true";

  let query = Repost.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);

  if (shouldPopulate) {
    query = query.populate({ path: "contentId" });
  }

  const [reposts, total] = await Promise.all([query.lean(), Repost.countDocuments({ userId })]);

  res.status(200).json({
    success: true,
    count: reposts.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: reposts,
  });
});

export const getContentReposts = TryCatch(async (req, res) => {
  const { contentType, contentId } = req.params;

  if (!["feed", "short"].includes(contentType)) {
    return res.status(400).json({ message: "Invalid contentType" });
  }

  const reposts = await Repost.find({ contentType, contentId })
    .sort({ createdAt: -1 })
    .populate("userId", "userName profilePic firstName lastName")
    .lean();

  res.status(200).json({ success: true, count: reposts.length, data: reposts });
});
