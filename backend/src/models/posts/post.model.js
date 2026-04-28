import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
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
      enum: ["public", "friends", "private"],
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

 
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;