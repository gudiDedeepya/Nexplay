import mongoose from "mongoose";
import dotenv from "dotenv";
import { bookingModel, gameModel } from "../models/userschema.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/NEXPLAY";

export async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    await Promise.all([
      bookingModel.createIndexes(),
      gameModel.createIndexes()
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
