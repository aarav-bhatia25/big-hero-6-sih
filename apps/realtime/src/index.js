require("dotenv").config({ path: "../../.env" });
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" } });

app.get("/health", (_req, res) => res.json({ status: "ok" }));
io.on("connection", (socket) => {
  socket.on("tourist:location", (location) => socket.broadcast.emit("tourist:location", location));
  socket.on("incident:create", (incident) => io.emit("incident:created", incident));
  socket.on("incident:update", (incident) => io.emit("incident:updated", incident));
});
httpServer.listen(process.env.SOCKET_PORT ?? 3001, () => console.log("Prahari realtime service listening on :3001"));
