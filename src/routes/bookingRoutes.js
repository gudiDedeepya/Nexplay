import express from "express";
import { auth } from "../middlewares/authmiddleware.js";
import {
  bookingModel,
  chatMessageModel,
  gameModel,
  venueModel
} from "../models/userschema.js";
import { validateBookingData } from "../utils/validators.js";
import { getVenueSlots } from "../utils/venueSlots.js";
import {
  addCalendarDays,
  dateKeyInTimeZone,
  dateRangeForBooking,
  parseBookingDate,
  slotStartInTimeZone
} from "../utils/bookingDates.js";

const router = express.Router();

router.post("/", auth, async (req, res, next) => {
  try {
    const validationError = validateBookingData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { venueId, bookingDate, slot } = req.body;
    const venue = await venueModel.findOne({ _id: venueId, active: { $ne: false } });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    if (!getVenueSlots(venue.operatingHours).includes(slot)) {
      return res.status(400).json({ message: "Invalid slot" });
    }

    const parsedDate = parseBookingDate(bookingDate);
    const todayKey = dateKeyInTimeZone(new Date());
    const maxDateKey = addCalendarDays(todayKey, 10);
    if (bookingDate < todayKey || bookingDate > maxDateKey) {
      return res.status(400).json({ message: "Bookings allowed only for next 10 days" });
    }

    const slotStart = slotStartInTimeZone(bookingDate, slot);
    if (bookingDate === todayKey && slotStart.getTime() <= Date.now()) {
      return res.status(400).json({ message: "This time slot has already started" });
    }

    const { start: startOfDay, end: endOfDay } = dateRangeForBooking(bookingDate);
    const existingBooking = await bookingModel.findOne({
      venueId,
      bookingDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      slot,
      status: "Booked"
    });

    if (existingBooking) {
      return res.status(409).json({ message: "Slot already booked" });
    }

    let booking;
    try {
      booking = await bookingModel.create({
        userId: req.userId,
        venueId,
        bookingDate: parsedDate.utcDate,
        slot
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Slot already booked" });
      }
      throw error;
    }

    await booking.populate("venueId");
    return res.status(201).json({ message: "Venue booked successfully", booking });
  } catch (error) {
    next(error);
  }
});

router.get("/", auth, async (req, res, next) => {
  try {
    const bookings = await bookingModel
      .find({ userId: req.userId })
      .populate("venueId");

    return res.status(200).json({ bookings: bookings.map(withCancellationDetails) });
  } catch (error) {
    next(error);
  }
});

router.get("/my-bookings", auth, async (req, res, next) => {
  try {
    const bookings = await bookingModel
      .find({ userId: req.userId })
      .populate("venueId");

    return res.status(200).json({ bookings: bookings.map(withCancellationDetails) });
  } catch (error) {
    next(error);
  }
});

router.get("/:bookingId", auth, async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await bookingModel
      .findOne({ _id: req.params.bookingId, userId: req.userId })
      .populate("venueId");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ booking: withCancellationDetails(booking) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:bookingId", auth, async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await bookingModel.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.status !== "Booked") {
      return res.status(409).json({ message: "This booking is already cancelled" });
    }

    const dateKey = booking.bookingDate.toISOString().slice(0, 10);
    const cancellationDeadline = new Date(
      slotStartInTimeZone(dateKey, booking.slot).getTime() - 24 * 60 * 60 * 1000
    );
    if (Date.now() > cancellationDeadline.getTime()) {
      return res.status(400).json({
        message: "Bookings can only be cancelled at least 24 hours before the slot starts"
      });
    }

    const cancelledBooking = await bookingModel.findOneAndUpdate(
      { _id: booking._id, userId: req.userId, status: "Booked" },
      { $set: { status: "Cancelled" } },
      { returnDocument: "after" }
    );
    if (!cancelledBooking) {
      return res.status(409).json({ message: "This booking is already cancelled" });
    }

    const game = await gameModel.findOneAndDelete({ bookingId: booking._id });
    if (game) {
      await chatMessageModel.deleteMany({ gameId: game._id });
    }

    return res.status(200).json({ message: "Booking cancelled" });
  } catch (error) {
    next(error);
  }
});

function withCancellationDetails(booking) {
  const dateKey = booking.bookingDate.toISOString().slice(0, 10);
  const cancellationDeadline = new Date(
    slotStartInTimeZone(dateKey, booking.slot).getTime() - 24 * 60 * 60 * 1000
  );
  return {
    ...booking.toObject(),
    cancellationDeadline: cancellationDeadline.toISOString(),
    cancellable: booking.status === "Booked" && Date.now() <= cancellationDeadline.getTime()
  };
}

export default router;
