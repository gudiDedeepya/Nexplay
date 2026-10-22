import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    bookingDate: { type: Date, required: true },
    slot: { type: String, required: true },
    status: {
      type: String,
      enum: ["Booked", "Cancelled"],
      default: "Booked"
    }
  },
  { timestamps: true, autoIndex: false }
);

bookingSchema.index(
  { venueId: 1, bookingDate: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Booked" }
  }
);

export const bookingModel = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
