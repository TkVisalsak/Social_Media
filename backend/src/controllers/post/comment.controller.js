import Comment from "../../models/posts/comment.model.js";
import Post from "../../models/posts/post.model.js";
import TryCatch from "../../utils/Trycatch.js";

//Create comment and reply
export const createComment = TryCatch(async (req, res) => {
  const { text, parentId } = req.body;
  const postId = req.params.postId;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({
      message: "Comment text is required",
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      message: "Post not found",
    });
  }

  
  if (parentId) {
    const parent = await Comment.findById(parentId);

    if (!parent || parent.parentId !== null) {
      return res.status(400).json({
        message: "Invalid parent comment",
      });
    }
  }

  const comment = await Comment.create({
    postId,
    userId,
    text,
    parentId: parentId || null,
  });

  
  if (parentId) {
    await Comment.findByIdAndUpdate(parentId, {
      $inc: { commentCount: 1 },
    });
  }

  const populatedComment = await comment.populate(
    "userId",
    "userName avatar"
  );

  res.status(201).json({
    message: parentId ? "Reply added" : "Comment added",
    comment: populatedComment,
  });
});
//Get comments and reply
export const getPostComments = TryCatch(async (req, res) => {
  const postId = req.params.postId;

  const comments = await Comment.find({ postId })
    .populate("userId", "userName avatar")
    .sort({ createdAt: -1 })
    .lean();

  const rootComments = comments.filter(c => !c.parentId);

  const structured = rootComments.map(comment => ({
    ...comment,
    replies: comments.filter(
      r => r.parentId && r.parentId.toString() === comment._id.toString()
    ),
  }));

  res.json({ comments: structured });
});
// delete comment and reply
export const deleteComment = TryCatch(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  const post = await Post.findById(comment.postId);

  if (
    comment.userId.toString() !== userId.toString() &&
    post.userId.toString() !== userId.toString()
  ) {
    return res.status(403).json({
      message: "Not allowed to delete this comment",
    });
  }

  // 🔥 if it's a reply → decrease parent's replyCount
  if (comment.parentId) {
    await Comment.findByIdAndUpdate(comment.parentId, {
      $inc: { replyCount: -1 },
    });
  }

  // 🔥 delete comment + its replies
  await Comment.deleteMany({
    $or: [{ _id: commentId }, { parentId: commentId }],
  });

  res.json({
    message: "Comment deleted",
  });
});
// Comment edit
export const editComment = TryCatch(async (req, res) => {
  const commentId = req.params.id;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text || !text.trim()) {
    return res.status(400).json({
      message: "Text cannot be empty",
    });
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  if (comment.userId.toString() !== userId.toString()) {
    return res.status(403).json({
      message: "Not allowed",
    });
  }

  comment.text = text;
  comment.isEdited = true;

  await comment.save();

  const updated = await comment.populate("userId", "userName avatar");

  res.json({
    message: "Comment updated",
    comment: updated,
  });
});