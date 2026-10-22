import { gameModel } from "../models/game.js";
import { slotStartInTimeZone } from "./bookingDates.js";

export async function expirePastGames(now = new Date()) {
  const candidates = await gameModel
    .find({
      status: { $in: ["Open", "Full"] },
      $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }]
    })
    .select("_id bookingId expiresAt")
    .populate({ path: "bookingId", select: "bookingDate slot" });

  if (!candidates.length) return;

  const updates = candidates
    .filter((game) => game.bookingId?.bookingDate && game.bookingId?.slot)
    .map((game) => {
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

  if (updates.length) await gameModel.bulkWrite(updates);
}
