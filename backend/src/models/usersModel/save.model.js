import mongoose from "mongoose";

const saveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    contentType: {
      type: String,
      enum: ["feed", "short"],
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate saves
saveSchema.index({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });

export default mongoose.model("Save", saveSchema);
