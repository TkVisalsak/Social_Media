import ShortVideo from "../../models/shortvideosModel/short.video.model.js";
import TryCatch from "../../utils/Trycatch.js";

export const toggleShortLike = TryCatch(async (req, res) => {
  const videoId = req.params.id;
  const userId = req.user._id;

  const video = await ShortVideo.findById(videoId);

  if (!video) {
    return res.status(404).json({
      message: "Video not found",
    });
  }

  const alreadyLiked = video.likes.includes(userId);

  if (alreadyLiked) {
  
    video.likes.pull(userId);
    video.likeCount = Math.max(0, video.likeCount - 1);
  } else {

    video.likes.push(userId);
    video.likeCount += 1;
  }

  await video.save();

  res.json({
    liked: !alreadyLiked,
    likeCount: video.likeCount,
  });
});

export const incrementShortShare = TryCatch(async (req, res) => {
  const videoId = req.params.id;

  const video = await ShortVideo.findByIdAndUpdate(
    videoId,
    { $inc: { shareCount: 1 } },
    { new: true }
  );

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  res.json({ shareCount: video.shareCount });
});

export const getShortLikeStatus = TryCatch(async (req, res) => {
  const videoId = req.params.id;
  const userId = req.user._id;

  const video = await ShortVideo.findById(videoId);

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  const liked = video.likes.includes(userId);

  res.json({
    liked,
    likeCount: video.likeCount,
  });
});