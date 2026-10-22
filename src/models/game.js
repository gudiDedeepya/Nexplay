import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sport: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    maxPlayers: { type: Number, required: true },
    joinedPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    skillLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner"
    },
    description: { type: String },
    status: {
      type: String,
      enum: ["Open", "Full", "Cancelled", "Expired"],
      default: "Open"
    },
    expiresAt: { type: Date, index: true }
  },
  { timestamps: true, autoIndex: false }
);

gameSchema.index({ bookingId: 1 }, { unique: true });

export const gameModel = mongoose.models.Game || mongoose.model("Game", gameSchema);
