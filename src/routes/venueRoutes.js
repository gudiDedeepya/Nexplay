import express from "express";
import mongoose from "mongoose";
import { bookingModel } from "../models/booking.js";
import { venueModel } from "../models/venue.js";
import { getPagination, paginationDetails } from "../utils/pagination.js";
import { getVenueSlots } from "../utils/venueSlots.js";
import {
  addCalendarDays,
  BOOKING_TIME_ZONE,
  dateKeyInTimeZone,
  dateRangeForBooking,
  minutesInTimeZone,
  parseBookingDate,
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

    return res.status(200).json({ venue });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { sport, search, minPrice, maxPrice, date, slot } = req.query;
    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({ message: "Invalid pagination parameters." });
    }
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

    let venues;
    let totalItems;
    if (date !== undefined) {
      const { start: startOfDay, end: endOfDay } = dateRangeForBooking(date);
      const currentMinutes = minutesInTimeZone(new Date(), BOOKING_TIME_ZONE);
      const openHour = { $toInt: { $substrBytes: ["$operatingHours.open", 0, 2] } };
      const closeHour = { $toInt: { $substrBytes: ["$operatingHours.close", 0, 2] } };
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: bookingModel.collection.name,
            let: { venueId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$venueId", "$$venueId"] },
                      { $gte: ["$bookingDate", startOfDay] },
                      { $lt: ["$bookingDate", endOfDay] },
                      { $eq: ["$status", "Booked"] }
                    ]
                  }
                }
              },
              { $project: { _id: 0, slot: 1 } }
            ],
            as: "bookedSlots"
          }
        },
        {
          $addFields: {
            availableSlots: {
              $filter: {
                input: {
                  $map: {
                    input: { $range: [openHour, closeHour] },
                    as: "hour",
                    in: {
                      $let: {
                        vars: { endHour: { $add: ["$$hour", 1] } },
                        in: {
                          $concat: [
                            { $cond: [{ $lt: ["$$hour", 10] }, "0", ""] },
                            { $toString: "$$hour" },
                            ":00-",
                            { $cond: [{ $lt: ["$$endHour", 10] }, "0", ""] },
                            { $toString: "$$endHour" },
                            ":00"
                          ]
                        }
                      }
                    }
                  }
                },
                as: "venueSlot",
                cond: {
                  $and: [
                    { $not: [{ $in: ["$$venueSlot", "$bookedSlots.slot"] }] },
                    ...(date === todayKey
                      ? [{
                          $gt: [
                            {
                              $multiply: [
                                { $toInt: { $substrBytes: ["$$venueSlot", 0, 2] } },
                                60
                              ]
                            },
                            currentMinutes
                          ]
                        }]
                      : []),
                    ...(slot ? [{ $eq: ["$$venueSlot", slot] }] : [])
                  ]
                }
              }
            }
          }
        },
        { $match: { "availableSlots.0": { $exists: true } } },
        {
          $facet: {
            venues: [
              { $sort: { createdAt: -1, _id: 1 } },
              { $skip: pagination.skip },
              { $limit: pagination.limit },
              { $project: { bookedSlots: 0, availableSlots: 0 } }
            ],
            metadata: [{ $count: "totalItems" }]
          }
        }
      ];
      const [result] = await venueModel.aggregate(pipeline);
      venues = result?.venues || [];
      totalItems = result?.metadata[0]?.totalItems || 0;
    } else {
      [totalItems, venues] = await Promise.all([
        venueModel.countDocuments(filter),
        venueModel
          .find(filter)
          .sort({ createdAt: -1, _id: 1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
      ]);
    }

    return res.status(200).json({
      venues,
      pagination: paginationDetails(pagination.page, pagination.limit, totalItems)
    });
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
