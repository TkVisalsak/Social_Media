import cloudinary from "cloudinary";
import Highlight from "../../models/highlightModel/highlight.model.js";
import TryCatch from "../../utils/Trycatch.js";
import getDataUrl from "../../utils/urlGenrator.js";

// GET /api/highlights — get all highlights for the authenticated user
export const getMyHighlights = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const highlights = await Highlight.find({ userId }).sort({ createdAt: -1 });
  res.json({ success: true, data: highlights });
});

// POST /api/highlights — create a new highlight
export const createHighlight = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { title, storyIds, coverUrl } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }

  let resolvedCoverUrl = coverUrl || "";
  if (req.file) {
    const fileUrl = getDataUrl(req.file);
    const uploaded = await cloudinary.v2.uploader.upload(fileUrl.content, {
      resource_type: "image",
      folder: "highlights",
    });
    resolvedCoverUrl = uploaded.secure_url;
  }

  const highlight = await Highlight.create({
    userId,
    title: title.trim(),
    storyIds: storyIds || [],
    coverUrl: resolvedCoverUrl,
  });

  res.status(201).json({ success: true, data: highlight });
});

// PUT /api/highlights/:id — update a highlight (only owner)
export const updateHighlight = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const highlight = await Highlight.findById(id);
  if (!highlight) {
    return res.status(404).json({ success: false, message: "Highlight not found" });
  }
  if (highlight.userId.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const { title, storyIds, coverUrl } = req.body;
  const update = {};
  if (title !== undefined) update.title = title.trim();
  if (storyIds !== undefined) update.storyIds = storyIds;
  if (coverUrl !== undefined) update.coverUrl = coverUrl;

  if (req.file) {
    const fileUrl = getDataUrl(req.file);
    const uploaded = await cloudinary.v2.uploader.upload(fileUrl.content, {
      resource_type: "image",
      folder: "highlights",
    });
    update.coverUrl = uploaded.secure_url;
  }

  const updated = await Highlight.findByIdAndUpdate(id, update, { new: true });
  res.json({ success: true, data: updated });
});

// DELETE /api/highlights/:id — delete a highlight (only owner)
export const deleteHighlight = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const highlight = await Highlight.findById(id);
  if (!highlight) {
    return res.status(404).json({ success: false, message: "Highlight not found" });
  }
  if (highlight.userId.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  await highlight.deleteOne();
  res.json({ success: true, message: "Highlight deleted" });
});
