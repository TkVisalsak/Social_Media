import Save from "../../models/usersModel/save.model.js";
import TryCatch from "../../utils/Trycatch.js";

// SAVE ITEM
export const saveItem = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { contentId, contentType } = req.body;

  const existing = await Save.findOne({ userId, contentId, contentType });

  if (existing) {
    return res.status(400).json({ message: "Already saved" });
  }

  const saved = await Save.create({
    userId,
    contentId,
    contentType,
  });

  res.status(201).json({
    message: "Saved successfully",
    saved,
  });
});

// UNSAVE ITEM
export const unsaveItem = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { contentId } = req.params;

  await Save.findOneAndDelete({ userId, contentId });

  res.json({ message: "Removed from saved" });
});

// GET USER SAVED ITEMS
export const getSavedItems = TryCatch(async (req, res) => {
  const { user } = req.params;

  const saved = await Save.find({ userId: user }).sort({ createdAt: -1 });

  res.json({ saved });
});

// CHECK IF SAVED
export const checkSaved = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { contentId } = req.params;
  const { contentType } = req.query;

  const exists = await Save.findOne({ userId, contentId, contentType });

  res.json({ saved: !!exists });
});