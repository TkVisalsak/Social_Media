import Save from "../../models/users/save.model.js";
import TryCatch from "../../utils/Trycatch.js";

// SAVE ITEM
export const saveItem = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { itemId, itemType } = req.body;

  const existing = await Save.findOne({ userId, itemId, itemType });

  if (existing) {
    return res.status(400).json({ message: "Already saved" });
  }

  const saved = await Save.create({
    userId,
    itemId,
    itemType,
  });

  res.status(201).json({
    message: "Saved successfully",
    saved,
  });
});

// UNSAVE ITEM
export const unsaveItem = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;

  await Save.findOneAndDelete({ userId, itemId });

  res.json({ message: "Removed from saved" });
});

// GET USER SAVED ITEMS
export const getSavedItems = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const saved = await Save.find({ userId }).sort({ createdAt: -1 });

  res.json({ saved });
});

// CHECK IF SAVED
export const checkSaved = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;

  const exists = await Save.findOne({ userId, itemId });

  res.json({ saved: !!exists });
});