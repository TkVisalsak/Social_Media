import express from "express";
import http from "http";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
// import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import { connectDB } from "./lib/db.js";
import { initSocket } from "./socket/socket.js";

// Routes
import authRoutes from "./routes/authRoute/auth.route.js";
import messageRoutes from "./routes/messageRoute/message.route.js";
import conversationRoutes from "./routes/messageRoute/conversation.route.js";
import feedRoutes from "./routes/feedRoute/feed.route.js";
import likeRoutes from "./routes/feedRoute/feed.like.route.js";
import commentRoutes from "./routes/feedRoute/feed.comment.route.js";
import shortVideoRoutes from "./routes/shortRoute/short.video.route.js";
import shortLikeRoutes from "./routes/shortRoute/short.like.route.js";
import shortCommentRoutes from "./routes/shortRoute/short.comment.route.js";
import followRoutes from "./routes/userRoute/follow.route.js";
import saveRoutes from "./routes/userRoute/save.route.js";
import repostRoutes from "./routes/userRoute/repost.route.js";
import hobbyRoutes from "./routes/userRoute/hobby.route.js";
import storyRoutes from "./routes/storyRoute/story.route.js";
import userSearchRoutes from "./routes/userRoute/user.search.route.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);
initSocket(server);

// ── CORS ─────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://localhost:5501",
  "http://localhost:5502",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Must be before every other middleware so preflight OPTIONS gets CORS headers.

app.use(cors(corsOptions));

// Trust the first proxy hop (required on Render / any reverse-proxy host).
app.set("trust proxy", 1);

// ── Security & parsing middleware ─────────────────────
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
// app.use(mongoSanitize());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Global throttle — protects every endpoint from runaway clients.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests" },
    validate: { trustProxy: false },
  })
);

// ── Health check ─────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ success: true, status: "ok", uptime: process.uptime() })
);

// ── Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/feeds", feedRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/shorts/video", shortVideoRoutes);
app.use("/api/shorts/likes", shortLikeRoutes);
app.use("/api/shorts/comments", shortCommentRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/save", saveRoutes);
app.use("/api/repost", repostRoutes);
app.use("/api/hobbies", hobbyRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/users", userSearchRoutes);

// ── 404 ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ─────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ── Boot ─────────────────────────────────────────────
connectDB().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
});
