import ShortVideo from "../../models/shortvideos/short.video.model.js";
import Comment from "../../models/posts/comment.model.js";
import TryCatch from "../../utils/Trycatch.js";

//Create short video
import { uploadToCloudinary } from "../../lib/uploadToCloudinary.js";

export const createShort = TryCatch(async (req, res) => {
  const { caption } = req.body;
  const userId = req.user._id;

  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "Video required" });
  }

  const duration = Number(req.body.duration);
  const safeDuration = Number.isFinite(duration) ? duration : 0;

  //upload to cloudinary
  const result = await uploadToCloudinary(file.buffer);

  const video = await ShortVideo.create({
    userId,
    videoUrl: result.secure_url,   
    caption,
    duration: safeDuration,
  });

  res.status(201).json({
    message: "Uploaded successfully",
    video,
  });
});

//watch tracking
export const addView = TryCatch(async (req, res) => {
  const videoId = req.params.id;

  await ShortVideo.findByIdAndUpdate(videoId, {
    $inc: { views: 1 },
  });

  res.json({
    message: "View counted",
  });
});


export const getShorts = async (req, res) => {
  const videos = await ShortVideo.find()
    .sort({ createdAt: -1 });

  res.json({ videos });
};