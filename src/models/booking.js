import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    bookingDate: { type: Date, required: true },
    slot: { type: String, required: true },
    status: {
      type: String,
      enum: ["Booked", "Cancelled", "Held"],
      default: "Booked"
    },
    holdExpiresAt: Date
    , occupiesSlot: { type: Boolean, default: function () { return this.status !== "Cancelled"; } }
  },
  { timestamps: true, autoIndex: false }
);

bookingSchema.index(
  { venueId: 1, bookingDate: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { occupiesSlot: true }
  }
);

export const bookingModel = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
