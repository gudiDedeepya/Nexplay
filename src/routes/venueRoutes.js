import express from "express";
import { auth, requireAdmin } from "../middlewares/authmiddleware.js";
import { bookingModel, venueModel } from "../models/userschema.js";
import { validateVenueData } from "../utils/validators.js";

const router = express.Router();
const SLOTS = ["16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00"];

router.get("/:venueId", async (req, res, next) => {
  try {
    const venue = await venueModel.findById(req.params.venueId);

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

    const venues = await venueModel.find(filter);
    return res.status(200).json({ venues });
  } catch (error) {
    next(error);
  }
});

router.get("/:venueId/slots", async (req, res, next) => {
  try {
    const venueId = req.params.venueId;
    const selectedDate = new Date(req.query.date);

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({ message: "Invalid booking date" });
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await bookingModel.find({
      venueId,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: "Booked"
    });

    const bookedSlots = bookings.map((booking) => booking.slot);
    const availableSlots = SLOTS.filter((slot) => !bookedSlots.includes(slot));

    return res.status(200).json({ availableSlots });
  } catch (error) {
    next(error);
  }
});

export default router;
