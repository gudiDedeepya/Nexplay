import mongoose from "mongoose";

const waitlistEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    bookingDate: { type: Date, required: true },
    slot: { type: String, required: true },
    status: {
      type: String,
      enum: ["Waiting", "Offered", "Accepted", "Expired", "Left"],
      default: "Waiting"
    },
    offeredAt: Date,
    offerExpiresAt: Date
  },
  { timestamps: true }
);

waitlistEntrySchema.index(
  { userId: 1, venueId: 1, bookingDate: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["Waiting", "Offered"] } } }
);
waitlistEntrySchema.index(
  { venueId: 1, bookingDate: 1, slot: 1, status: 1, createdAt: 1 }
);

export const waitlistEntryModel = mongoose.models.WaitlistEntry ||
  mongoose.model("WaitlistEntry", waitlistEntrySchema);
