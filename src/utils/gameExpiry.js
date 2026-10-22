import { gameModel } from "../models/game.js";
import { slotStartInTimeZone } from "./bookingDates.js";
import { revokeAllGameChatAccess } from "../realtime/chatServer.js";

export async function expirePastGames(now = new Date()) {
  const candidates = await gameModel
    .find({
      status: { $in: ["Open", "Full"] },
      $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }]
    })
    .select("_id bookingId expiresAt")
    .populate({ path: "bookingId", select: "bookingDate slot" });

  if (!candidates.length) return;

  const updates = candidates.map((game) => {
      if (!game.bookingId?.bookingDate || !game.bookingId?.slot) {
        return {
          updateOne: {
            filter: { _id: game._id, status: { $in: ["Open", "Full"] } },
            update: { $set: { status: "Expired" } }
          }
        };
      }

      const bookingDate = game.bookingId.bookingDate.toISOString().slice(0, 10);
      const expiresAt = slotStartInTimeZone(bookingDate, game.bookingId.slot);
      return {
        updateOne: {
          filter: { _id: game._id, status: { $in: ["Open", "Full"] } },
          update: {
            $set: {
              expiresAt,
              ...(expiresAt <= now ? { status: "Expired" } : {})
            }
          }
        }
      };
    });

  if (!updates.length) return;

  await gameModel.bulkWrite(updates);
  await Promise.all(candidates
    .filter((game) => {
      if (!game.bookingId?.bookingDate || !game.bookingId?.slot) return true;
      const bookingDate = game.bookingId.bookingDate.toISOString().slice(0, 10);
      return slotStartInTimeZone(bookingDate, game.bookingId.slot) <= now;
    })
    .map((game) =>
      revokeAllGameChatAccess(game._id.toString(), "This game has expired.")
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
