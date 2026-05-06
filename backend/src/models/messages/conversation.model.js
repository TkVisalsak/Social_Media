import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },

    // group only
    name:    { type: String },
    avatar:  { type: String },
    admin:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // both 1-to-1 and group
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;