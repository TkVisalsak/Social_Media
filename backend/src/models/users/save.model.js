import mongoose from "mongoose";

const saveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    itemType: {
      type: String,
      enum: ["post", "short", "story"],
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate saves
saveSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });

export default mongoose.model("Save", saveSchema);
