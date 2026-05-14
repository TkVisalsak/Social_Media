import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // 'like' | 'comment' | 'follow' | 'story_reply'
    type: { type: String, required: true },

    // The post / comment / story that triggered the notification
    targetId:   { type: mongoose.Schema.Types.ObjectId },
    targetType: { type: String }, // 'feed' | 'comment' | 'story'

    message: { type: String },
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
