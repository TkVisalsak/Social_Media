import Post from "../../models/posts/post.model.js";
import TryCatch from "../../utils/Trycatch.js";
import getDataUrl from "../../utils/urlGenrator.js";
import cloudinary from "cloudinary";

//Create post
export const createPost = TryCatch(async (req, res) => {

  let media = [];

  if (req.file) {
    const fileUrl = getDataUrl(req.file);
    const isVideo = req.file.mimetype.startsWith("video");

    const uploaded = await cloudinary.v2.uploader.upload(
      fileUrl.content,
      {
        resource_type: isVideo ? "video" : "image",
      }
    );

    media.push({
      type: isVideo ? "video" : "image",
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    });
  }

  if (!req.body.caption && media.length === 0) {
    return res.status(400).json({
      message: "Post must contain caption or media",
    });
  }

  const post = await Post.create({
    userId: req.user._id,
    caption: req.body.caption || "",
    media,
  });

  return res.status(201).json({
    message: "Post created",
    post,
  });
});

//get posts
export const getFeedPosts = TryCatch(async (req, res) => {
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

const posts = await Post.find()
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit)
  .populate("userId", "userName avatar");

res.json({
  posts,
  page,
  limit
});
});


export const getPostById = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    "userId",
    "userName avatar"
  );

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(post);
});

//Delete post
export const deletePost = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  // delete from cloudinary
  for (let item of post.media) {
    await cloudinary.v2.uploader.destroy(item.publicId, {
      resource_type: item.type === "video" ? "video" : "image",
    });
  }

  await post.deleteOne();

  res.json({ message: "Post deleted" });
});

export const updateCaption = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  post.caption = req.body.caption || post.caption;
  post.isEdited = true;

  await post.save();

  res.json({
    message: "Post updated",
    post,
  });
});