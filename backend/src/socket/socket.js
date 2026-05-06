import { Server } from "socket.io";
import Conversation from "../models/messages/conversation.model.js";
import Message      from "../models/messages/message.model.js";
import Follow       from "../models/users/follow.model.js";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5501",
  "http://localhost:5502",
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
  },
});
// userId → Set of socketIds (one user can have multiple tabs)
const onlineUsers = new Map();

async function areFriends(a, b) {
  const [x, y] = await Promise.all([
    Follow.exists({ follower: a, following: b }),
    Follow.exists({ follower: b, following: a }),
  ]);
  return x && y;
}

export function initSocket(server) {
  const io = new Server(server, {
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
        const conv = await Conversation.findOne({
          _id: conversationId,
          members: userId,
        });
        if (!conv) return socket.emit("error", "Not a member of this conversation");

        // for 1-to-1: enforce friend check
        if (!conv.isGroup) {
          const otherId = conv.members.find((m) => m.toString() !== userId);
          const friend  = await areFriends(userId, otherId);
          if (!friend) return socket.emit("error", "Not friends");
        }

        if (!text && !image) return socket.emit("error", "Empty message");

        const message = await Message.create({
          conversationId,
          senderId: userId,
          text,
          image,
          readBy: [userId], // sender has read their own message
        });

        // update conversation's lastMessage + updatedAt (for sidebar sorting)
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });

        const populated = await message.populate("senderId", "username avatar");

        // emit to everyone in the room (including sender)
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
        // tell others in room this user has read
        socket.to(conversationId).emit("messagesRead", { conversationId, userId });
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // ── TYPING ──────────────────────────────────────────────────
    socket.on("typing",      ({ conversationId }) =>
      socket.to(conversationId).emit("userTyping",      { conversationId, userId }));

    socket.on("stopTyping",  ({ conversationId }) =>
      socket.to(conversationId).emit("userStoppedTyping",{ conversationId, userId }));

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