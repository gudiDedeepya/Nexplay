import express from "express";
import { auth } from "../middlewares/authmiddleware.js";
import { bookingModel, gameModel, venueModel } from "../models/userschema.js";
import { validateBookingData } from "../utils/validators.js";

const router = express.Router();
const SLOTS = ["16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00"];

router.post("/", auth, async (req, res, next) => {
  try {
    const validationError = validateBookingData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { venueId, bookingDate, slot } = req.body;
    const venue = await venueModel.findById(venueId);

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    if (!SLOTS.includes(slot)) {
      return res.status(400).json({ message: "Invalid slot" });
    }

    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 10);

    if (selectedDate < today || selectedDate > maxDate) {
      return res.status(400).json({ message: "Bookings allowed only for next 10 days" });
    }

    const existingBooking = await bookingModel.findOne({
      venueId,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      slot,
      status: "Booked"
    });

    if (existingBooking) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    let booking;
    try {
      booking = await bookingModel.create({
        userId: req.userId,
        venueId,
        bookingDate: startOfDay,
        slot
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Slot already booked" });
      }
      throw error;
    }

    return res.status(201).json({ message: "Venue booked successfully", booking });
  } catch (error) {
    next(error);
  }
});

router.get("/", auth, async (req, res, next) => {
  try {
    const bookings = await bookingModel
      .find({ userId: req.userId, status: "Booked" })
      .populate("venueId");

    return res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.get("/my-bookings", auth, async (req, res, next) => {
  try {
    const bookings = await bookingModel
      .find({ userId: req.userId, status: "Booked" })
      .populate("venueId");

    return res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.delete("/:bookingId", auth, async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    booking.status = "Cancelled";
    await booking.save();
    await gameModel.deleteOne({ bookingId: booking._id });

    return res.status(200).json({ message: "Booking cancelled" });
  } catch (error) {
    next(error);
  }
});

export default router;
