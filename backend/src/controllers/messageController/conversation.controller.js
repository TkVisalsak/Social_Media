import Conversation from "../../models/messages/conversation.model.js";
import Message      from "../../models/messages/message.model.js";
import Follow       from "../../models/users/follow.model.js";

// helper — are userA and userB mutual followers (friends)?
async function areFriends(userA, userB) {
  const [a, b] = await Promise.all([
    Follow.exists({ follower: userA, following: userB }),
    Follow.exists({ follower: userB, following: userA }),
  ]);
  return a && b;
}

// GET /api/conversations
// Returns only conversations where the user has exchanged at least 1 message
// AND (for 1-to-1) the other person is a mutual friend
export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ members: userId })
      .populate("members", "username avatar")
      .populate({
        path: "lastMessage",
        select: "text image createdAt senderId",
      })
      .sort({ updatedAt: -1 });

    // filter: only include if lastMessage exists (meaning actual chat happened)
    // and for 1-to-1, only if they are friends
    const result = [];

    for (const conv of conversations) {
      if (!conv.lastMessage) continue; // no messages yet — skip

      if (!conv.isGroup) {
        const other = conv.members.find(
          (m) => m._id.toString() !== userId.toString()
        );
        if (!other) continue;
        const friend = await areFriends(userId, other._id);
        if (!friend) continue; // not friends — hide conversation
      }

      result.push(conv);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/conversations/dm/:userId
// Get or create a 1-to-1 conversation (only if friends)
export const getOrCreateDM = async (req, res) => {
  try {
    const me     = req.user._id;
    const other  = req.params.userId;

    const friend = await areFriends(me, other);
    if (!friend) {
      return res.status(403).json({ message: "You can only DM mutual friends" });
    }

    // find existing 1-to-1 conversation between the two
    let conv = await Conversation.findOne({
      isGroup: false,
      members: { $all: [me, other], $size: 2 },
    }).populate("members", "username avatar");

    if (!conv) {
      conv = await Conversation.create({ members: [me, other] });
      conv = await conv.populate("members", "username avatar");
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/conversations/group
// body: { name, memberIds: [...] }
export const createGroup = async (req, res) => {
  try {
    const me      = req.user._id;
    const { name, memberIds } = req.body;

    if (!name)                         return res.status(400).json({ message: "Group name required" });
    if (!memberIds || memberIds.length < 2)
      return res.status(400).json({ message: "At least 2 other members required" });

    const members = [...new Set([me.toString(), ...memberIds])]; // dedupe, ensure self

    const conv = await Conversation.create({
      isGroup: true,
      name,
      admin: me,
      members,
    });

    await conv.populate("members", "username avatar");
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/conversations/:convId/messages
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { convId } = req.params;

    const conv = await Conversation.findOne({ _id: convId, members: userId });
    if (!conv) return res.status(403).json({ message: "Not a member" });

    const messages = await Message.find({ conversationId: convId })
      .populate("senderId", "username avatar")
      .sort({ createdAt: 1 })
      .limit(100); // paginate later

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};