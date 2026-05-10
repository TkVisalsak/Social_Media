import mongoose from "mongoose";

const strorySchema = new mongoose.Schema(
    {

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

    mediaUrl: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
        },
      },
    ],

  type: {
    type: String,
    enum: ["image", "video"],
    default: "image",
  },

  viewers: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      viewedAt: { type: Date, default: Date.now },
    },
  ],

  visibility: {
    type: String,
    enum: ["public", "friends", "private", "followers"],
    default: "public",
  },

  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, { timestamps: true });

const Story = mongoose.model("Story", strorySchema);
export default Story;