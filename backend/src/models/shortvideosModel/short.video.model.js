import mongoose from "mongoose";

const shortVideoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    videoUrl: {
      type: String,
      required: true,
    },

    thumbnailUrl: String,

    caption: {
      type: String,
      maxlength: 300,
      trim: true,
    },

     
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likeCount: {
      type: Number,
      default: 0,
    },

    
    commentCount: {
      type: Number,
      default: 0,
    },

     
    shareCount: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    duration: {
      type: Number,
      default: 0,
    },

     
    score: {
      type: Number,
      default: 0,
      index: true,
    },

    visibility: {
      type: String,
      enum: ["public", "followers", "friends", "private"],
      default: "public",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

 
shortVideoSchema.index({ createdAt: -1 });
shortVideoSchema.index({ likeCount: -1 });
shortVideoSchema.index({ views: -1 });
shortVideoSchema.index({ score: -1 });

const ShortVideo = mongoose.model("ShortVideo", shortVideoSchema);

export default ShortVideo;