import { bookingModel } from "../models/booking.js";
import { waitlistEntryModel } from "../models/waitlistEntry.js";
import { dateRangeForBooking } from "./bookingDates.js";
import { emitToUser } from "../realtime/chatServer.js";

export async function expireWaitlistOffers(now = new Date()) {
  const expiredEntries = await waitlistEntryModel
    .find({ status: "Offered", offerExpiresAt: { $lte: now } })
    .select("userId venueId bookingDate slot");

  for (const entry of expiredEntries) {
    await waitlistEntryModel.updateOne(
      { _id: entry._id, status: "Offered", offerExpiresAt: { $lte: now } },
      { $set: { status: "Expired" } }
    );
    await bookingModel.updateOne(
      {
        userId: entry.userId,
        venueId: entry.venueId,
        bookingDate: entry.bookingDate,
        slot: entry.slot,
        status: "Held",
        holdExpiresAt: { $lte: now }
      },
      { $set: { status: "Cancelled", occupiesSlot: false } }
    );
    await offerNextWaitlist(entry.venueId, entry.bookingDate, entry.slot);
  }

  await bookingModel.updateMany(
    { status: "Held", holdExpiresAt: { $lte: now } },
    { $set: { status: "Cancelled", occupiesSlot: false } }
  );
}

export async function offerNextWaitlist(venueId, bookingDate, slot) {
  const date = new Date(bookingDate);
  const { start, end } = dateRangeForBooking(date.toISOString().slice(0, 10));
  const entry = await waitlistEntryModel.findOneAndUpdate(
    {
      venueId,
      bookingDate: { $gte: start, $lt: end },
      slot,
      status: "Waiting"
    },
    {
      $set: {
        status: "Offered",
        offeredAt: new Date(),
        offerExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    },
    { sort: { createdAt: 1, _id: 1 }, returnDocument: "after" }
  );
  if (!entry) return null;

  try {
    await bookingModel.create({
      userId: entry.userId,
      venueId,
      bookingDate: start,
      slot,
      status: "Held",
      occupiesSlot: true,
      holdExpiresAt: entry.offerExpiresAt
    });
  } catch (error) {
    await waitlistEntryModel.updateOne({ _id: entry._id }, { $set: { status: "Expired" } });
    return offerNextWaitlist(venueId, bookingDate, slot);
  }

  emitToUser(entry.userId.toString(), "waitlist:offer", {
    entryId: entry._id.toString(),
    venueId: venueId.toString(),
    bookingDate: date.toISOString().slice(0, 10),
    slot,
    offerExpiresAt: entry.offerExpiresAt
  });
  return entry;
}

export function startWaitlistExpiryScheduler({ intervalMs = 15_000 } = {}) {
  const run = () => expireWaitlistOffers().catch((error) =>
    console.error("Could not expire waitlist offers:", error)
  );
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
