import { Server } from "socket.io";
import Conversation from "../models/messagesModel/conversation.model.js";
import Message      from "../models/messagesModel/message.model.js";
import Follow       from "../models/usersModel/follow.model.js";

// userId → Set of socketIds (one user can have multiple tabs)
const onlineUsers = new Map();

// module-level io — populated by initSocket, exported for controllers
export let io = null;

export function getReceiverSocketIds(userId) {
  return [...(onlineUsers.get(String(userId)) || [])];
}

async function areFriends(a, b) {
  const [x, y] = await Promise.all([
    Follow.exists({ follower: a, following: b }),
    Follow.exists({ follower: b, following: a }),
  ]);
  return x && y;
}

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) { socket.disconnect(); return; }

    // track online
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit("onlineUsers", [...onlineUsers.keys()]);

    // join all conversation rooms this user belongs to
    (async () => {
      const convs = await Conversation.find({ members: userId }, "_id");
      convs.forEach((c) => socket.join(c._id.toString()));
    })();

    // ── SEND MESSAGE ──────────────────────────────────────────────
    socket.on("sendMessage", async ({ conversationId, text, image }) => {
      try {
        const conv = await Conversation.findOne({ _id: conversationId, members: userId });
        if (!conv) return socket.emit("error", "Not a member of this conversation");

        if (!conv.isGroup) {
          const otherId = conv.members.find((m) => m.toString() !== userId);
          const friend  = await areFriends(userId, otherId);
          if (!friend) {
            // Non-mutual: allow only 1 message until the other person replies.
            const [myCount, theirCount] = await Promise.all([
              Message.countDocuments({ conversationId, senderId: userId }),
              Message.countDocuments({ conversationId, senderId: { $ne: userId } }),
            ]);
            if (myCount >= 1 && theirCount === 0) {
              return socket.emit("error", "Waiting for reply before you can send more messages");
            }
          }
        }

        if (!text && !image) return socket.emit("error", "Empty message");

        const message = await Message.create({
          conversationId,
          senderId: userId,
          text,
          image,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });

        const populated = await message.populate("senderId", "userName profilePic");
        io.to(conversationId).emit("newMessage", populated);
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // ── MARK READ ────────────────────────────────────────────────
    socket.on("markRead", async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversationId, readBy: { $ne: userId } },
          { $push: { readBy: userId } }
        );
        socket.to(conversationId).emit("messagesRead", { conversationId, userId });
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // ── TYPING ──────────────────────────────────────────────────
    socket.on("typing",     ({ conversationId }) =>
      socket.to(conversationId).emit("userTyping",       { conversationId, userId }));

    socket.on("stopTyping", ({ conversationId }) =>
      socket.to(conversationId).emit("userStoppedTyping", { conversationId, userId }));

    // ── DISCONNECT ───────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      io.emit("onlineUsers", [...onlineUsers.keys()]);
    });
  });

  return io;
}
