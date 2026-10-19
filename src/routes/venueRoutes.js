import express from "express";
import { auth, requireAdmin } from "../middlewares/authmiddleware.js";
import { bookingModel, venueModel } from "../models/userschema.js";
import { validateVenueData } from "../utils/validators.js";
import { getVenueSlots } from "../utils/venueSlots.js";
import {
  BOOKING_TIME_ZONE,
  dateKeyInTimeZone,
  dateRangeForBooking,
  minutesInTimeZone,
  parseBookingDate
} from "../utils/bookingDates.js";

const router = express.Router();

router.get("/:venueId", async (req, res, next) => {
  try {
    const venue = await venueModel.findOne({ _id: req.params.venueId, active: { $ne: false } });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    return res.status(200).json({ venue });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, requireAdmin, async (req, res, next) => {
  try {
    const validationError = validateVenueData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, sport, location, pricePerHour, description } = req.body;
    const venue = await venueModel.create({
      name,
      sport,
      location,
      pricePerHour: Number(pricePerHour),
      description
    });

    return res.status(201).json({ message: "Venue created successfully", venue });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const sport = req.query.sport;
    const filter = {};

    if (sport) {
      filter.sport = sport;
    }
    filter.active = { $ne: false };

    const venues = await venueModel.find(filter);
    return res.status(200).json({ venues });
  } catch (error) {
    next(error);
  }
});

router.get("/:venueId/slots", async (req, res, next) => {
  try {
    const venueId = req.params.venueId;
    const parsedDate = parseBookingDate(req.query.date);
    if (!parsedDate) {
      return res.status(400).json({ message: "Invalid booking date" });
    }

    const venue = await venueModel.findOne({ _id: venueId, active: { $ne: false } });
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const { start: startOfDay, end: endOfDay } = dateRangeForBooking(parsedDate.dateKey);

    const bookings = await bookingModel.find({
      venueId,
      bookingDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: "Booked"
    });

    const bookedSlots = bookings.map((booking) => booking.slot);
    const todayKey = dateKeyInTimeZone(new Date(), BOOKING_TIME_ZONE);
    const currentMinutes = minutesInTimeZone(new Date(), BOOKING_TIME_ZONE);
    const availableSlots = getVenueSlots(venue.operatingHours).filter((slot) => {
      const startHour = Number(slot.slice(0, 2));
      const hasNotPassed = parsedDate.dateKey !== todayKey || startHour * 60 > currentMinutes;
      return hasNotPassed && !bookedSlots.includes(slot);
    });

    return res.status(200).json({ availableSlots });
  } catch (error) {
    next(error);
  }
});

export default router;
