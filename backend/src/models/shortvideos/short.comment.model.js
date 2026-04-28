import mongoose from "mongoose";

const shortCommentSchema = new mongoose.Schema(
  {
    shortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortVideo",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortComment",
      default: null,
    },

    replyCount: {
      type: Number,
      default: 0,
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

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

 
shortCommentSchema.index({ shortId: 1, createdAt: -1 });
shortCommentSchema.index({ parentId: 1 });

const ShortComment = mongoose.model("ShortComment", shortCommentSchema);

export default ShortComment;