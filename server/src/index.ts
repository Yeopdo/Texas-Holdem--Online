import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { GameRoom } from "./gameEngine";
import { ActionPayload, JoinPayload } from "./types";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const room = new GameRoom();

// socket.id -> deviceId, so we know who to notify on disconnect
const socketToDevice = new Map<string, string>();

function broadcastState() {
  for (const { deviceId, socketId } of room.allDeviceIds()) {
    if (!socketId) continue;
    io.to(socketId).emit("state", room.getPublicState(deviceId));
    const privateHand = room.getPrivateHandFor(deviceId);
    io.to(socketId).emit("privateHand", privateHand);
  }
}

room.onStateChange = broadcastState;
room.onHandResult = (result) => {
  io.emit("handResult", result);
};

io.on("connection", (socket: Socket) => {
  socket.on("join", (payload: JoinPayload) => {
    try {
      room.join(payload.deviceId, payload.nickname, payload.photoDataUri, socket.id);
      socketToDevice.set(socket.id, payload.deviceId);
      broadcastState();
    } catch (err) {
      socket.emit("error", (err as Error).message);
    }
  });

  socket.on("startGame", () => {
    try {
      room.startGame();
    } catch (err) {
      socket.emit("error", (err as Error).message);
    }
  });

  socket.on("action", (payload: ActionPayload) => {
    const deviceId = socketToDevice.get(socket.id);
    if (!deviceId) {
      socket.emit("error", "먼저 참가해주세요.");
      return;
    }
    try {
      room.handleAction(deviceId, payload);
    } catch (err) {
      socket.emit("error", (err as Error).message);
    }
  });

  socket.on("leave", () => {
    const deviceId = socketToDevice.get(socket.id);
    if (deviceId) {
      room.leave(deviceId);
      socketToDevice.delete(socket.id);
    }
  });

  socket.on("disconnect", () => {
    room.handleDisconnect(socket.id);
    socketToDevice.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`poker server listening on :${PORT}`);
});
