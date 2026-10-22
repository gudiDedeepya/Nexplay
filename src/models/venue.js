import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true },
    location: { type: String, required: true },
    pricePerHour: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    operatingHours: {
      open: { type: String, default: "16:00" },
      close: { type: String, default: "21:00" }
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const venueModel = mongoose.models.Venue || mongoose.model("Venue", venueSchema);
