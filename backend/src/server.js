import express  from "express";
import http     from "http";
import { initSocket } from "./socket/socket.js";

const app    = express();
const server = http.createServer(app);
initSocket(server);           

server.listen(5002);