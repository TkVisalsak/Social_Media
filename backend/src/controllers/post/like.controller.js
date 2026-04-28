import Like from "../../models/posts/like.model.js";
import Post from "../../models/posts/post.model.js";
import TryCatch from "../../utils/Trycatch.js";

//like and unlike post
export const toggleLike = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const deleted = await Like.findOneAndDelete({ userId, postId });

  // If something was deleted → it was liked → now unliked
  if (deleted) {
    return res.json({
      message: "Unliked",
      liked: false,
    });
  }

  // Otherwise → create like
  try {
    await Like.create({ userId, postId });

    return res.json({
      message: "Liked",
      liked: true,
    });
  } catch (err) {
    // Handle race condition safely
    if (err.code === 11000) {
      return res.json({
        message: "Already liked",
        liked: true,
      });
    }
    throw err;
  }
});
export const getPostLikes = TryCatch(async (req, res) => {
  const postId = req.params.id;

  const count = await Like.countDocuments({ postId });

  res.json({
    postId,
    likes: count,
  });
});
export const checkUserLike = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const postId = req.params.id;

  const liked = await Like.findOne({
    userId,
    postId,
  });

  res.json({
    liked: !!liked,
  });
});