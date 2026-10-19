import express from "express";
import mongoose from "mongoose";
import { auth, requireAdmin } from "../middlewares/authmiddleware.js";
import { bookingModel, venueModel, venueReviewModel } from "../models/userschema.js";
import { validateVenueData } from "../utils/validators.js";
import { normalizeVenueData } from "../utils/venueData.js";
import { withVenueReviewStats } from "../utils/venueReviewStats.js";
import { getVenueSlots } from "../utils/venueSlots.js";
import {
  addCalendarDays,
  BOOKING_TIME_ZONE,
  dateKeyInTimeZone,
  dateRangeForBooking,
  minutesInTimeZone,
  parseBookingDate,
  slotStartInTimeZone
} from "../utils/bookingDates.js";

const router = express.Router();

router.get("/:venueId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }
    const venue = await venueModel.findOne({ _id: req.params.venueId, active: { $ne: false } });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const [venueWithStats] = await withVenueReviewStats([venue]);
    return res.status(200).json({ venue: venueWithStats });
  } catch (error) {
    next(error);
  }
});

router.get("/:venueId/reviews", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }
    const venue = await venueModel.findOne({
      _id: req.params.venueId,
      active: { $ne: false }
    });
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const [reviews, bookings] = await Promise.all([
      venueReviewModel
        .find({ venueId: venue._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("userId", "name"),
      bookingModel.find({ venueId: venue._id, userId: req.userId, status: "Booked" })
    ]);
    const reviewedBookingIds = new Set(
      (await venueReviewModel.find({ userId: req.userId }).select("bookingId"))
        .map((review) => review.bookingId.toString())
    );
    const eligibleBookings = bookings
      .filter((booking) => isCompletedBooking(booking) && !reviewedBookingIds.has(booking._id.toString()))
      .map((booking) => ({
        _id: booking._id,
        bookingDate: booking.bookingDate,
        slot: booking.slot
      }));

    return res.status(200).json({ reviews, eligibleBookings });
  } catch (error) {
    next(error);
  }
});

router.post("/:venueId/reviews", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }
    const { bookingId, rating, text = "" } = req.body;
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "A valid completed booking is required." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
    }
    if (typeof text !== "string" || text.trim().length > 1000) {
      return res.status(400).json({ message: "Review text must be 1000 characters or fewer." });
    }

    const booking = await bookingModel.findOne({
      _id: bookingId,
      venueId: req.params.venueId,
      userId: req.userId,
      status: "Booked"
    });
    if (!booking || !isCompletedBooking(booking)) {
      return res.status(403).json({
        message: "You can review a venue only after your booking has finished."
      });
    }

    const venue = await venueModel.findOne({
      _id: req.params.venueId,
      active: { $ne: false }
    });
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    try {
      const review = await venueReviewModel.create({
        venueId: venue._id,
        bookingId: booking._id,
        userId: req.userId,
        rating,
        text: text.trim()
      });
      await review.populate("userId", "name");
      return res.status(201).json({ message: "Review added", review });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "This booking has already been reviewed." });
      }
      throw error;
    }
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

    const venue = await venueModel.create(normalizeVenueData(req.body));

    return res.status(201).json({ message: "Venue created successfully", venue });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { sport, search, minPrice, maxPrice, date, slot } = req.query;
    const filter = {};

    if (sport) {
      if (typeof sport !== "string") {
        return res.status(400).json({ message: "Invalid sport filter" });
      }
      filter.sport = sport;
    }
    if (search !== undefined) {
      if (typeof search !== "string" || search.trim().length > 100) {
        return res.status(400).json({ message: "Search must be 100 characters or fewer." });
      }
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (escapedSearch) {
        filter.$or = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { location: { $regex: escapedSearch, $options: "i" } }
        ];
      }
    }

    const priceFilter = {};
    for (const [key, value] of [["minPrice", minPrice], ["maxPrice", maxPrice]]) {
      if (value !== undefined) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) {
          return res.status(400).json({ message: "Price filters must be non-negative numbers." });
        }
        priceFilter[key === "minPrice" ? "$gte" : "$lte"] = amount;
      }
    }
    if (
      priceFilter.$gte !== undefined &&
      priceFilter.$lte !== undefined &&
      priceFilter.$gte > priceFilter.$lte
    ) {
      return res.status(400).json({ message: "Minimum price cannot exceed maximum price." });
    }
    if (Object.keys(priceFilter).length) {
      filter.pricePerHour = priceFilter;
    }

    if (slot !== undefined) {
      if (
        typeof slot !== "string" ||
        !/^([01]\d|2[0-3]):00-([01]\d|2[0-3]):00$/.test(slot) ||
        Number(slot.slice(6, 8)) !== Number(slot.slice(0, 2)) + 1 ||
        date === undefined
      ) {
        return res.status(400).json({ message: "Choose a valid date and one-hour time slot." });
      }
    }
    const todayKey = dateKeyInTimeZone(new Date(), BOOKING_TIME_ZONE);
    if (date !== undefined) {
      if (!parseBookingDate(date)) {
        return res.status(400).json({ message: "Invalid availability date" });
      }
      if (date < todayKey || date > addCalendarDays(todayKey, 10)) {
        return res.status(400).json({
          message: "Availability date must be within the next 10 days."
        });
      }
    }
    filter.active = { $ne: false };

    let venues = await venueModel.find(filter);
    if (date !== undefined) {
      const { start: startOfDay, end: endOfDay } = dateRangeForBooking(date);
      const bookings = await bookingModel.find({
        venueId: { $in: venues.map((venue) => venue._id) },
        bookingDate: { $gte: startOfDay, $lt: endOfDay },
        status: "Booked"
      }).select("venueId slot");
      const bookedByVenue = new Map();
      for (const booking of bookings) {
        const venueId = booking.venueId.toString();
        if (!bookedByVenue.has(venueId)) bookedByVenue.set(venueId, new Set());
        bookedByVenue.get(venueId).add(booking.slot);
      }
      const currentMinutes = minutesInTimeZone(new Date(), BOOKING_TIME_ZONE);
      venues = venues.filter((venue) => {
        const bookedSlots = bookedByVenue.get(venue._id.toString()) || new Set();
        const availableSlots = getVenueSlots(venue.operatingHours).filter((venueSlot) => {
          const startHour = Number(venueSlot.slice(0, 2));
          const hasNotPassed = date !== todayKey || startHour * 60 > currentMinutes;
          return hasNotPassed && !bookedSlots.has(venueSlot);
        });
        return slot ? availableSlots.includes(slot) : availableSlots.length > 0;
      });
    }

    return res.status(200).json({ venues: await withVenueReviewStats(venues) });
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

function isCompletedBooking(booking) {
  const match = /^([01]\d|2[0-3]):00-([01]\d|2[0-3]):00$/.exec(booking.slot);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return false;
  const dateKey = booking.bookingDate.toISOString().slice(0, 10);
  const endTime = slotStartInTimeZone(dateKey, booking.slot).getTime() + 60 * 60 * 1000;
  return endTime <= Date.now();
}
