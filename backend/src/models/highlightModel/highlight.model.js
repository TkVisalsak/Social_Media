import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    coverUrl: {
      type: String,
      default: "",
    },
    storyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  { timestamps: true }
);

const Highlight = mongoose.model("Highlight", highlightSchema);
export default Highlight;
