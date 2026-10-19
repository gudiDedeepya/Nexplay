import express from "express";
import mongoose from "mongoose";
import { auth, requireAdmin } from "../middlewares/authmiddleware.js";
import {
  bookingModel,
  chatMessageModel,
  gameModel,
  venueModel
} from "../models/userschema.js";
import { validateVenueData } from "../utils/validators.js";

const router = express.Router();
router.use(auth, requireAdmin);

router.get("/dashboard", async (req, res, next) => {
  try {
    const [venueCount, totalBookings, activeBookings, cancelledBookings, gameCount, popularSports] =
      await Promise.all([
        venueModel.countDocuments({ active: { $ne: false } }),
        bookingModel.countDocuments(),
        bookingModel.countDocuments({ status: "Booked" }),
        bookingModel.countDocuments({ status: "Cancelled" }),
        gameModel.countDocuments(),
        bookingModel.aggregate([
          { $match: { status: "Booked" } },
          {
            $lookup: {
              from: venueModel.collection.name,
              localField: "venueId",
              foreignField: "_id",
              as: "venue"
            }
          },
          { $unwind: "$venue" },
          { $group: { _id: "$venue.sport", bookings: { $sum: 1 } } },
          { $sort: { bookings: -1, _id: 1 } },
          { $limit: 5 },
          { $project: { _id: 0, sport: "$_id", bookings: 1 } }
        ])
      ]);

    return res.status(200).json({
      metrics: {
        venueCount,
        totalBookings,
        activeBookings,
        cancelledBookings,
        gameCount,
        popularSports,
        revenueTracked: false
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/venues", async (req, res, next) => {
  try {
    const venues = await venueModel.find().sort({ createdAt: -1 });
    return res.status(200).json({ venues });
  } catch (error) {
    next(error);
  }
});

router.post("/venues", async (req, res, next) => {
  try {
    const validationError = validateVenueData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, sport, location, pricePerHour, description, image, operatingHours } = req.body;
    const venue = await venueModel.create({
      name: name.trim(),
      sport: sport.trim(),
      location: location.trim(),
      pricePerHour: Number(pricePerHour),
      description,
      image,
      operatingHours: operatingHours || { open: "16:00", close: "21:00" },
      active: true
    });

    return res.status(201).json({ message: "Venue created successfully", venue });
  } catch (error) {
    next(error);
  }
});

router.put("/venues/:venueId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    const validationError = validateVenueData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, sport, location, pricePerHour, description, image, operatingHours } = req.body;
    const venue = await venueModel.findByIdAndUpdate(
      req.params.venueId,
      {
        $set: {
          name: name.trim(),
          sport: sport.trim(),
          location: location.trim(),
          pricePerHour: Number(pricePerHour),
          description,
          image,
          operatingHours
        }
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    return res.status(200).json({ message: "Venue updated successfully", venue });
  } catch (error) {
    next(error);
  }
});

router.delete("/venues/:venueId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    const venue = await venueModel.findByIdAndUpdate(
      req.params.venueId,
      { $set: { active: false } },
      { returnDocument: "after" }
    );
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    return res.status(200).json({ message: "Venue removed from public listings" });
  } catch (error) {
    next(error);
  }
});

router.get("/bookings", async (req, res, next) => {
  try {
    const bookings = await bookingModel
      .find()
      .sort({ bookingDate: -1, createdAt: -1 })
      .populate("userId", "name email")
      .populate("venueId", "name sport location pricePerHour");

    return res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.get("/games", async (req, res, next) => {
  try {
    const games = await gameModel
      .find()
      .sort({ createdAt: -1 })
      .populate("organizerId", "name email")
      .populate("joinedPlayers", "name email")
      .populate({ path: "bookingId", populate: { path: "venueId", select: "name sport location" } });

    return res.status(200).json({ games });
  } catch (error) {
    next(error);
  }
});

router.delete("/games/:gameId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.gameId)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const game = await gameModel.findByIdAndDelete(req.params.gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    await chatMessageModel.deleteMany({ gameId: game._id });
    return res.status(200).json({ message: "Game and its chat history removed" });
  } catch (error) {
    next(error);
  }
});

export default router;
