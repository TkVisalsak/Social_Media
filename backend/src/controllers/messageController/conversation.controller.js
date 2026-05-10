import Conversation from "../../models/messagesModel/conversation.model.js";
import Message      from "../../models/messagesModel/message.model.js";
import Follow       from "../../models/usersModel/follow.model.js";
import TryCatch     from "../../utils/Trycatch.js";

async function areFriends(userA, userB) {
  const [a, b] = await Promise.all([
    Follow.exists({ follower: userA, following: userB }),
    Follow.exists({ follower: userB, following: userA }),
  ]);
  return a && b;
}

// GET /api/conversations
export const getMyConversations = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({ members: userId })
    .populate("members", "userName profilePic")
    .populate({ path: "lastMessage", select: "text image createdAt senderId" })
    .sort({ updatedAt: -1 });

  const result = [];

  for (const conv of conversations) {
    if (!conv.lastMessage) continue;

    if (!conv.isGroup) {
      const other = conv.members.find((m) => m._id.toString() !== userId.toString());
      if (!other) continue;
      const friend = await areFriends(userId, other._id);
      if (!friend) continue;
    }

    result.push(conv);
  }

  res.json(result);
});

// POST /api/conversations/dm/:userId
export const getOrCreateDM = TryCatch(async (req, res) => {
  const me    = req.user._id;
  const other = req.params.userId;

  const friend = await areFriends(me, other);
  if (!friend) {
    return res.status(403).json({ message: "You can only DM mutual friends" });
  }

  let conv = await Conversation.findOne({
    isGroup: false,
    members: { $all: [me, other], $size: 2 },
  }).populate("members", "userName profilePic");

  if (!conv) {
    conv = await Conversation.create({ members: [me, other] });
    conv = await conv.populate("members", "userName profilePic");
  }

  res.json(conv);
});

// POST /api/conversations/group
export const createGroup = TryCatch(async (req, res) => {
  const me = req.user._id;
  const { name, memberIds } = req.body;

  if (!name) return res.status(400).json({ message: "Group name required" });
  if (!memberIds || memberIds.length < 2)
    return res.status(400).json({ message: "At least 2 other members required" });

  const members = [...new Set([me.toString(), ...memberIds])];

  const conv = await Conversation.create({ isGroup: true, name, admin: me, members });

  await conv.populate("members", "userName profilePic");
  res.status(201).json(conv);
});

// GET /api/conversations/:convId/messages
export const getMessages = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { convId } = req.params;

  const conv = await Conversation.findOne({ _id: convId, members: userId });
  if (!conv) return res.status(403).json({ message: "Not a member" });

  const messages = await Message.find({ conversationId: convId })
    .populate("senderId", "userName profilePic")
    .sort({ createdAt: 1 })
    .limit(100);

  res.json(messages);
});
