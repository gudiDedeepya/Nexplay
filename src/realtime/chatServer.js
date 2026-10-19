import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { getJwtSecret } from "../config/security.js";
import { chatMessageModel, gameModel, userModel } from "../models/userschema.js";

function roomForGame(gameId) {
  return `game:${gameId}`;
}

export function attachChatServer(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

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
