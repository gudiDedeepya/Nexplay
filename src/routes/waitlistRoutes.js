import express from "express";
import { auth } from "../middlewares/authmiddleware.js";
import { bookingModel } from "../models/booking.js";
import { venueModel } from "../models/venue.js";
import { waitlistEntryModel } from "../models/waitlistEntry.js";
import { dateRangeForBooking, parseBookingDate } from "../utils/bookingDates.js";
import { expireWaitlistOffers, offerNextWaitlist } from "../utils/waitlist.js";

const router = express.Router();

router.get("/mine", auth, async (req, res, next) => {
  try {
    await expireWaitlistOffers();
    const entries = await waitlistEntryModel
      .find({ userId: req.userId, status: { $in: ["Waiting", "Offered"] } })
      .populate("venueId", "name location")
      .sort({ bookingDate: 1, slot: 1 });
    res.status(200).json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, async (req, res, next) => {
  try {
    const { venueId, bookingDate, slot } = req.body;
    const parsedDate = parseBookingDate(bookingDate);
    const venue = await venueModel.findOne({ _id: venueId, active: { $ne: false } });
    if (!parsedDate || !venue || typeof slot !== "string") {
      return res.status(400).json({ message: "Invalid waitlist request" });
    }
    const { start, end } = dateRangeForBooking(bookingDate);
    const occupied = await bookingModel.findOne({
      venueId,
      bookingDate: { $gte: start, $lt: end },
      slot,
      status: { $in: ["Booked", "Held"] }
    });
    if (!occupied) {
      return res.status(409).json({ message: "This slot is not fully booked" });
    }
    const ownsSlot = await bookingModel.exists({
      _id: occupied._id,
      userId: req.userId
    });
    if (ownsSlot) {
      return res.status(409).json({ message: "You already have this slot booked" });
    }

    const entry = await waitlistEntryModel.create({
      userId: req.userId,
      venueId,
      bookingDate: parsedDate.utcDate,
      slot,
      status: "Waiting"
    });
    res.status(201).json({ message: "Joined waitlist", entry });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You are already on this waitlist" });
    next(error);
  }
});

router.delete("/:entryId", auth, async (req, res, next) => {
  try {
    const entry = await waitlistEntryModel.findOneAndUpdate(
      { _id: req.params.entryId, userId: req.userId, status: "Waiting" },
      { $set: { status: "Left" } },
      { returnDocument: "after" }
    );
    if (!entry) return res.status(409).json({ message: "Waitlist entry is no longer waiting" });
    res.status(200).json({ message: "Left waitlist" });
  } catch (error) {
    next(error);
  }
});

router.post("/:entryId/accept", auth, async (req, res, next) => {
  try {
    await expireWaitlistOffers();
    const entry = await waitlistEntryModel.findOne({
      _id: req.params.entryId,
      userId: req.userId,
      status: "Offered",
      offerExpiresAt: { $gt: new Date() }
    });
    if (!entry) return res.status(409).json({ message: "Offer has expired" });

    const booking = await bookingModel.findOneAndUpdate(
      {
        userId: req.userId,
        venueId: entry.venueId,
        bookingDate: entry.bookingDate,
        slot: entry.slot,
        status: "Held",
        holdExpiresAt: { $gt: new Date() }
      },
      { $set: { status: "Booked", occupiesSlot: true }, $unset: { holdExpiresAt: 1 } },
      { returnDocument: "after" }
    );
    if (!booking) return res.status(409).json({ message: "Offer hold has expired" });

    entry.status = "Accepted";
    await entry.save();
    res.status(200).json({ message: "Slot accepted", booking });
  } catch (error) {
    next(error);
  }
});

router.post("/:entryId/decline", auth, async (req, res, next) => {
  try {
    const entry = await waitlistEntryModel.findOneAndUpdate(
      {
        _id: req.params.entryId,
        userId: req.userId,
        status: "Offered",
        offerExpiresAt: { $gt: new Date() }
      },
      { $set: { status: "Left" } },
      { returnDocument: "after" }
    );
    if (!entry) return res.status(409).json({ message: "Offer has expired or is no longer available" });

    await bookingModel.updateOne(
      {
        userId: req.userId,
        venueId: entry.venueId,
        bookingDate: entry.bookingDate,
        slot: entry.slot,
        status: "Held"
      },
      { $set: { status: "Cancelled", occupiesSlot: false } }
    );
    await offerNextWaitlist(entry.venueId, entry.bookingDate, entry.slot);

    res.status(200).json({ message: "Offer declined. The next player has been offered the slot." });
  } catch (error) {
    next(error);
  }
});

export default router;
