import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { getJwtSecret } from "../config/security.js";
import { chatMessageModel } from "../models/chatMessage.js";
import { gameModel } from "../models/game.js";
import { userModel } from "../models/user.js";

function roomForGame(gameId) {
  return `game:${gameId}`;
}

let chatIo;
const messageAttemptsByUser = new Map();
const MESSAGE_RATE_LIMIT = 8;
const MESSAGE_RATE_WINDOW_MS = 10_000;

function allowChatMessage(userId, now = Date.now()) {
  if (messageAttemptsByUser.size > 1000) {
    for (const [user, attempts] of messageAttemptsByUser) {
      if (!attempts.length || attempts[attempts.length - 1] <= now - MESSAGE_RATE_WINDOW_MS) {
        messageAttemptsByUser.delete(user);
      }
    }
  }

  const recentAttempts = (messageAttemptsByUser.get(userId) || [])
    .filter((timestamp) => timestamp > now - MESSAGE_RATE_WINDOW_MS);
  if (recentAttempts.length >= MESSAGE_RATE_LIMIT) {
    messageAttemptsByUser.set(userId, recentAttempts);
    return false;
  }

  recentAttempts.push(now);
  messageAttemptsByUser.set(userId, recentAttempts);
  return true;
}

export async function revokeGameChatAccess(gameId, userId) {
  if (!chatIo) return;

  const sockets = await chatIo.in(roomForGame(gameId)).fetchSockets();
  const memberSockets = sockets.filter((socket) => socket.data.userId === userId);
  await Promise.all(
    memberSockets.map(async (socket) => {
      socket.emit("game:access-revoked", { gameId });
      await socket.leave(roomForGame(gameId));
    })
  );
}

export async function revokeAllGameChatAccess(gameId, reason) {
  if (!chatIo) return;

  const room = roomForGame(gameId);
  const sockets = await chatIo.in(room).fetchSockets();
  await Promise.all(
    sockets.map(async (socket) => {
      socket.emit("game:access-revoked", { gameId, reason });
      await socket.leave(room);
    })
  );
}

export function attachChatServer(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });
  chatIo = io;

  io.use(async (socket, next) => {
    let decoded;
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) {
        return next(new Error("Authentication required"));
      }

      decoded = jwt.verify(token, getJwtSecret());
      if (!Number.isFinite(decoded.exp)) {
        return next(new Error("Authentication token must have an expiration"));
      }
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return next(new Error("Invalid or expired authentication token"));
      }

      return next(error);
    }

    try {
      const user = await userModel.findById(decoded.userId).select("_id");
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.userId = user._id.toString();
      socket.data.tokenExpiresAt = decoded.exp * 1000;
      return next();
    } catch (error) {
      console.error("Could not authenticate chat connection:", error);
      return next(new Error("Unable to authenticate chat connection"));
    }
  });

  io.on("connection", (socket) => {
    const expirationTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.tokenExpiresAt - Date.now())
    );
    expirationTimer.unref?.();
    socket.once("disconnect", () => clearTimeout(expirationTimer));

    socket.on("game:join", async (payload, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};

      try {
        const { gameId } = payload || {};
        if (typeof gameId !== "string" || !/^[a-f\d]{24}$/i.test(gameId)) {
          return reply({ ok: false, message: "Invalid game ID" });
        }

        const game = await gameModel.findOne({
          _id: gameId,
          joinedPlayers: socket.data.userId
        }).select("_id");

        if (!game) {
          return reply({ ok: false, message: "Join this game to access its chat" });
        }

        await socket.join(roomForGame(gameId));
        return reply({ ok: true });
      } catch (error) {
        console.error("Could not join game chat:", error);
        return reply({ ok: false, message: "Unable to join game chat" });
      }
    });

    socket.on("game:leave", async (payload, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};
      const { gameId } = payload || {};
      if (typeof gameId !== "string" || !/^[a-f\d]{24}$/i.test(gameId)) {
        return reply({ ok: false, message: "Invalid game ID" });
      }

      await socket.leave(roomForGame(gameId));
      return reply({ ok: true });
    });

    socket.on("game:message", async (payload, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};

      try {
        const { gameId, content, clientMessageId } = payload || {};
        if (typeof gameId !== "string" || !/^[a-f\d]{24}$/i.test(gameId)) {
          return reply({ ok: false, message: "Invalid game ID" });
        }

        if (typeof content !== "string" || !content.trim() || content.trim().length > 1000) {
          return reply({ ok: false, message: "Message must be between 1 and 1000 characters" });
        }

        if (
          clientMessageId !== undefined &&
          (typeof clientMessageId !== "string" || clientMessageId.length > 100)
        ) {
          return reply({ ok: false, message: "Invalid message identifier" });
        }

        if (!allowChatMessage(socket.data.userId)) {
          return reply({
            ok: false,
            message: "You are sending messages too quickly. Please wait a moment."
          });
        }

        const game = await gameModel.findOne({
          _id: gameId,
          joinedPlayers: socket.data.userId
        }).select("_id joinedPlayers");

        const room = roomForGame(gameId);
        if (!game || !socket.rooms.has(room)) {
          return reply({ ok: false, message: "Join this game to send chat messages" });
        }

        const message = await chatMessageModel.create({
          gameId: game._id,
          senderId: socket.data.userId,
          content: content.trim()
        });
        await message.populate("senderId", "name");

        const currentPlayerIds = new Set(game.joinedPlayers.map((id) => id.toString()));
        const eligibleSockets = (await io.in(room).fetchSockets())
          .filter((connectedSocket) => currentPlayerIds.has(connectedSocket.data.userId))
          .map((connectedSocket) => connectedSocket.id);

        if (eligibleSockets.length > 0) {
          io.to(eligibleSockets).emit("game:message", { message, clientMessageId });
        }

        return reply({ ok: true, message: message.toObject() });
      } catch (error) {
        console.error("Could not send game chat message:", error);
        return reply({ ok: false, message: "Unable to send message" });
      }
    });
  });

  return io;
}
