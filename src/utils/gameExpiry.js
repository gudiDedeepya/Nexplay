import { bookingModel } from "../models/booking.js";
import { gameModel } from "../models/game.js";
import {
  dateKeyInTimeZone,
  dateRangeForBooking,
  slotStartInTimeZone
} from "./bookingDates.js";
import { revokeAllGameChatAccess } from "../realtime/chatServer.js";

export async function expirePastGames(now = new Date()) {
  const todayEnd = dateRangeForBooking(dateKeyInTimeZone(now)).end;
  const bookingsThroughToday = await bookingModel
    .find({ bookingDate: { $lt: todayEnd } })
    .distinct("_id");
  const candidates = await gameModel
    .find({
      status: { $in: ["Open", "Full"] },
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false } },
        { bookingId: { $in: bookingsThroughToday } }
      ]
    })
    .select("_id bookingId expiresAt")
    .populate({ path: "bookingId", select: "bookingDate slot" });

  if (!candidates.length) return;

  const updates = [];
  const expiredGameIds = [];
  for (const game of candidates) {
    if (!game.bookingId?.bookingDate || !game.bookingId?.slot) {
      updates.push({
        updateOne: {
          filter: { _id: game._id, status: { $in: ["Open", "Full"] } },
          update: { $set: { status: "Expired" } }
        }
      });
      expiredGameIds.push(game._id.toString());
      continue;
    }

    const bookingDate = game.bookingId.bookingDate.toISOString().slice(0, 10);
    const expiresAt = slotStartInTimeZone(bookingDate, game.bookingId.slot);
    updates.push({
      updateOne: {
        filter: { _id: game._id, status: { $in: ["Open", "Full"] } },
        update: {
          $set: {
            expiresAt,
            ...(expiresAt <= now ? { status: "Expired" } : {})
          }
        }
      }
    });
    if (expiresAt <= now) expiredGameIds.push(game._id.toString());
  }

  await gameModel.bulkWrite(updates);
  await Promise.all(expiredGameIds.map((gameId) =>
    revokeAllGameChatAccess(gameId, "This game has expired.")
  ));
}

export function startGameExpiryScheduler({ intervalMs = 60_000 } = {}) {
  const runExpiry = () => {
    expirePastGames().catch((error) => {
      console.error("Could not expire past games:", error);
    });
  };
  runExpiry();
  const timer = setInterval(runExpiry, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
