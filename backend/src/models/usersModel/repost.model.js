import mongoose from "mongoose";

const repostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    contentType: {
      type: String,
      enum: ["feed", "short"],
      required: true,
    },

    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "contentModel",
    },

    caption: {
      type: String,
      trim: true,
      default: "",
    },

    visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

repostSchema.virtual("contentModel").get(function () {
  return this.contentType === "feed" ? "Feed" : "ShortVideo";
});

repostSchema.index(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true }
);

repostSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });


repostSchema.index({ userId: 1, createdAt: -1 });

const Repost = mongoose.model("Repost", repostSchema);

export default Repost;