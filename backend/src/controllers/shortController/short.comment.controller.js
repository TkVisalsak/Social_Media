import ShortComment from "../../models/shortvideosModel/short.comment.model.js";
import ShortVideo from "../../models/shortvideosModel/short.video.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const createShortComment = TryCatch(async (req, res) => {
  const { text, parentId } = req.body;
  const shortId = req.params.shortId;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Comment required" });
  }

  const video = await ShortVideo.findById(shortId);

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  if (parentId) {
    const parent = await ShortComment.findById(parentId);

    if (!parent || parent.parentId) {
      return res.status(400).json({
        message: "Invalid parent comment",
      });
    }
  }

  const comment = await ShortComment.create({
    shortId,
    userId,
    text,
    parentId: parentId || null,
  });

  // 📊 update counts properly
  if (parentId) {
    await ShortComment.findByIdAndUpdate(parentId, {
      $inc: { replyCount: 1 },
    });
  } else {
    await ShortVideo.findByIdAndUpdate(shortId, {
      $inc: { commentCount: 1 },
    });
  }

  const populated = await comment.populate("userId", "userName profilePic firstName lastName");

  res.status(201).json({
    message: parentId ? "Reply added" : "Comment added",
    comment: populated,
  });
});

export const getShortComments = TryCatch(async (req, res) => {
  const shortId = req.params.shortId;

  const comments = await ShortComment.find({ shortId })
    .populate("userId", "userName profilePic firstName lastName")
    .sort({ createdAt: -1 })
    .lean();

  const roots = comments.filter(c => !c.parentId);

  const structured = roots.map(comment => ({
    ...comment,
    replies: comments.filter(
      r => r.parentId?.toString() === comment._id.toString()
    ),
  }));

  res.json({ comments: structured });
});

export const deleteShortComment = TryCatch(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user._id;

  const comment = await ShortComment.findById(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (comment.userId.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const shortId = comment.shortId;

  // 🔥 delete comment + replies
  await ShortComment.deleteMany({
    $or: [{ _id: commentId }, { parentId: commentId }],
  });

  // 📉 adjust counts correctly
  if (comment.parentId) {
    await ShortComment.findByIdAndUpdate(comment.parentId, {
      $inc: { replyCount: -1 },
    });
  } else {
    await ShortVideo.findByIdAndUpdate(shortId, {
      $inc: { commentCount: -1 },
    });
  }

  res.json({ message: "Deleted" });
});

export const editShortComment = TryCatch(async (req, res) => {
  const { text } = req.body;
  const commentId = req.params.id;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Text required" });
  }

  const comment = await ShortComment.findById(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Not found" });
  }

  if (comment.userId.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not allowed" });
  }

  comment.text = text;
  comment.isEdited = true;

  await comment.save();

  const updated = await comment.populate("userId", "userName profilePic firstName lastName");

  res.json({
    message: "Updated",
    comment: updated,
  });
});

export const replyShortComment = TryCatch(async (req, res) => {
  const { text } = req.body;
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Reply text required" });
  }

  const parent = await ShortComment.findById(commentId);

  if (!parent) {
    return res.status(404).json({ message: "Parent comment not found" });
  }

  // 🚨 prevent deep nesting (1-level only)
  if (parent.parentId) {
    return res.status(400).json({
      message: "Replies to replies are not allowed",
    });
  }

  const reply = await ShortComment.create({
    shortId: parent.shortId,
    userId,
    text,
    parentId: commentId,
  });

  // 📊 update counters
  await ShortComment.findByIdAndUpdate(commentId, {
    $inc: { replyCount: 1 },
  });

  const populated = await reply.populate("userId", "userName profilePic firstName lastName");

  res.status(201).json({
    message: "Reply added",
    reply: populated,
  });
});