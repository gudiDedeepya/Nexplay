import mongoose from "mongoose";
import dotenv from "dotenv";
import { bookingModel } from "../models/booking.js";
import { gameModel } from "../models/game.js";
import { waitlistEntryModel } from "../models/waitlistEntry.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/NEXPLAY";

export async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    await migrateActiveBookingSlots();
    await Promise.all([
      bookingModel.createIndexes(),
      gameModel.createIndexes(),
      waitlistEntryModel.createIndexes()
    ]);
    console.log("MongoDB Connected");
  } catch (error) {
    if (error.code === 11000) {
      console.error(
        "MongoDB contains duplicate active booking slots or games per booking. Resolve those duplicates before starting NexPlay."
      );
    }
    console.error("MongoDB connection or required index setup failed:", error);
    throw error;
  }
}

async function migrateActiveBookingSlots() {
  await bookingModel.updateMany(
    { status: { $in: ["Booked", "Held"] } },
    { $set: { occupiesSlot: true } }
  );
  await bookingModel.updateMany(
    { status: "Cancelled" },
    { $set: { occupiesSlot: false } }
  );

  const indexes = await bookingModel.collection.indexes();
  for (const index of indexes) {
    const key = JSON.stringify(index.key);
    if (
      key === JSON.stringify({ venueId: 1, bookingDate: 1, slot: 1 }) &&
      index.name !== "active_booking_per_slot"
    ) {
      await bookingModel.collection.dropIndex(index.name);
    }
  }
}
