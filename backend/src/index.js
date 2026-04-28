import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
// Database and Cloudinary
import { connectDB } from "./lib/db.js";
import cloudinary from "./lib/cloudinary.js";
import { app, server } from "./lib/socket.js";
// Middleware
import cookieParser from "cookie-parser";
import cors from "cors";
// auth
import authRoutes from "./routes/authRoute/auth.route.js";
//messages
import messageRoutes from "./routes/messageRoute/message.route.js";
// posts
import postRoutes from "./routes/post/post.route.js";
import likeRoutes from "./routes/post/like.route.js";
import commentRoutes from "./routes/post/comment.route.js";
//shorts video
import shortVideoRoutes from "./routes/shortRoute/short.video.route.js";
import shortLikeRoutes from "./routes/shortRoute/short.like.route.js";
import shortCommentRoutes from "./routes/shortRoute/short.comment.route.js";


// import passport from "passport";
// import "./lib/google.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const HOST = process.env.PORT ? "0.0.0.0" : "127.0.0.1";

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://localhost:5501",
  "http://localhost:5502",
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
  "http://localhost:62083/",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


//auth routes
app.use("/api/auth", authRoutes);
//message routes
app.use("/api/messages", messageRoutes);
//post routes
app.use("/api/posts", postRoutes);
app.use("/api/likes", likeRoutes); 
app.use("/api/comments", commentRoutes);
//short video  
app.use("/api/shorts/video", shortVideoRoutes);
app.use("/api/shorts/likes", shortLikeRoutes);
app.use("/api/shorts/comments", shortCommentRoutes);

 
connectDB();



server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});

