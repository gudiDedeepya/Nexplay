import express from "express";
import mongoose from "mongoose";
import { auth, optionalAuth } from "../middlewares/authmiddleware.js";
import { bookingModel, chatMessageModel, gameModel } from "../models/userschema.js";
import { validateGameData } from "../utils/validators.js";
import { revokeGameChatAccess } from "../realtime/chatServer.js";

const router = express.Router();

router.post("/", auth, async (req, res, next) => {
  try {
    const validationError = validateGameData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { title, bookingId, maxPlayers, skillLevel, description } = req.body;
    const booking = await bookingModel.findById(bookingId).populate("venueId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.status !== "Booked") {
      return res.status(400).json({ message: "Cannot create a game for a cancelled booking" });
    }

    const existingGame = await gameModel.findOne({ bookingId });
    if (existingGame) {
      return res.status(400).json({ message: "Game already exists for this booking" });
    }

    const game = await gameModel.create({
      title,
      sport: booking.venueId.sport,
      bookingId,
      organizerId: req.userId,
      maxPlayers: Number(maxPlayers),
      joinedPlayers: [req.userId],
      skillLevel,
      description,
      status: "Open"
    });

    return res.status(201).json({ message: "Game created successfully", game });
  } catch (error) {
    next(error);
  }
});

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const games = await gameModel
      .find({ status: "Open" })
      .populate("organizerId", "name")
      .populate({
        path: "bookingId",
        populate: {
          path: "venueId"
        }
      });

    const gamesWithMembership = games.map((game) => {
      const gameData = game.toObject();
      gameData.joinedByMe = Boolean(
        req.userId &&
        game.joinedPlayers.some((playerId) => playerId.toString() === req.userId)
      );
      return gameData;
    });

    return res.status(200).json({ games: gamesWithMembership });
  } catch (error) {
    next(error);
  }
});

router.get("/:gameId/messages", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.gameId)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(parsedLimit) ? 40 : Math.max(1, Math.min(parsedLimit, 100));
    let cursorFilter;
    if (req.query.before !== undefined) {
      if (
        typeof req.query.before !== "string" ||
        !mongoose.isValidObjectId(req.query.before)
      ) {
        return res.status(400).json({ message: "Invalid message cursor" });
      }
    }

    const game = await gameModel.findById(req.params.gameId).select("joinedPlayers");
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (!game.joinedPlayers.some((playerId) => playerId.toString() === req.userId)) {
      return res.status(403).json({ message: "Join this game to view its chat" });
    }

    const filter = { gameId: game._id };
    if (req.query.before) {
      const cursorMessage = await chatMessageModel
        .findOne({ _id: req.query.before, gameId: game._id })
        .select("_id createdAt");
      if (!cursorMessage) {
        return res.status(400).json({ message: "Invalid message cursor" });
      }
      filter.$or = [
        { createdAt: { $lt: cursorMessage.createdAt } },
        { createdAt: cursorMessage.createdAt, _id: { $lt: cursorMessage._id } }
      ];
    }

    const page = await chatMessageModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("senderId", "name");
    const hasMore = page.length > limit;
    const messages = page.slice(0, limit).reverse();

    return res.status(200).json({ messages, hasMore });
  } catch (error) {
    next(error);
  }
});

router.post("/:gameId/join", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.gameId)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const gameId = new mongoose.Types.ObjectId(req.params.gameId);
    const playerId = new mongoose.Types.ObjectId(req.userId);
    const result = await gameModel.collection.updateOne(
      {
        _id: gameId,
        status: "Open",
        joinedPlayers: { $ne: playerId },
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$joinedPlayers", []] } },
            "$maxPlayers"
          ]
        }
      },
      [
        {
          $set: {
            joinedPlayers: {
              $concatArrays: [
                { $ifNull: ["$joinedPlayers", []] },
                [playerId]
              ]
            },
            updatedAt: new Date()
          }
        },
        {
          $set: {
            status: {
              $cond: [
                { $gte: [{ $size: "$joinedPlayers" }, "$maxPlayers"] },
                "Full",
                "Open"
              ]
            }
          }
        }
      ]
    );

    if (result.matchedCount === 1) {
      return res.status(200).json({ message: "Joined game successfully" });
    }

    const game = await gameModel.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.joinedPlayers.some((player) => player.toString() === req.userId)) {
      return res.status(400).json({ message: "Already joined" });
    }

    if (game.status === "Full" || game.joinedPlayers.length >= game.maxPlayers) {
      return res.status(409).json({ message: "Game is full" });
    }

    return res.status(400).json({ message: "Game is not open for joining" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:gameId/leave", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.gameId)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const gameId = new mongoose.Types.ObjectId(req.params.gameId);
    const playerId = new mongoose.Types.ObjectId(req.userId);
    const result = await gameModel.collection.updateOne(
      {
        _id: gameId,
        joinedPlayers: playerId
      },
      [
        {
          $set: {
            joinedPlayers: {
              $filter: {
                input: { $ifNull: ["$joinedPlayers", []] },
                as: "player",
                cond: { $ne: ["$$player", playerId] }
              }
            },
            updatedAt: new Date()
          }
        },
        {
          $set: {
            status: {
              $cond: [
                { $eq: ["$status", "Cancelled"] },
                "Cancelled",
                {
                  $cond: [
                    { $lt: [{ $size: "$joinedPlayers" }, "$maxPlayers"] },
                    "Open",
                    "Full"
                  ]
                }
              ]
            }
          }
        }
      ]
    );

    if (result.matchedCount === 0) {
      const game = await gameModel.findById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      return res.status(400).json({ message: "You have not joined this game" });
    }

    await revokeGameChatAccess(gameId.toString(), playerId.toString());
    return res.status(200).json({ message: "Left game successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/my-games", auth, async (req, res, next) => {
  try {
    const games = await gameModel
      .find({ organizerId: req.userId })
      .populate({
        path: "bookingId",
        populate: {
          path: "venueId"
        }
      });

    return res.status(200).json({ games });
  } catch (error) {
    next(error);
  }
});

router.get("/joined-games", auth, async (req, res, next) => {
  try {
    const games = await gameModel
      .find({ joinedPlayers: req.userId })
      .populate({
        path: "bookingId",
        populate: {
          path: "venueId"
        }
      });

    return res.status(200).json({ games });
  } catch (error) {
    next(error);
  }
});

export default router;
