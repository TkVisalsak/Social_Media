import mongoose from "mongoose";

const feedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    caption: {
      type: String,
      trim: true,
      default: "",
    },

    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: false,
        },
        url: {
          type: String,
          required: false,
        },
        publicId: {
          type: String,
          required: false,
        },
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
    },

    visibility: {
      type: String,
      enum: ["public", "friends", "private", "followers"],
      default: "public",
    },

    hashtags: [
      {
        type: String,
        index: true,
      },
    ],

    location: {
      type: String,
      default: "",
    },

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

 
feedSchema.index({ userId: 1, createdAt: -1 });
feedSchema.index({ createdAt: -1 });
feedSchema.index({ visibility: 1, createdAt: -1 });

const Feed = mongoose.model("Feed", feedSchema);

export default Feed;