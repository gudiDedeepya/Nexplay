import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    location: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    sports: [String]
  },
  { timestamps: true }
);

const venueSchema = new Schema(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true },
    location: { type: String, required: true },
    pricePerHour: { type: Number, required: true },
    image: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);

const gameSchema = new Schema(
  {
    title: { type: String, required: true },
    sport: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    maxPlayers: { type: Number, required: true },
    joinedPlayers: [{ type: Schema.Types.ObjectId, ref: "user" }],
    skillLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner"
    },
    description: { type: String },
    status: {
      type: String,
      enum: ["Open", "Full", "Cancelled"],
      default: "Open"
    }
  },
  { timestamps: true, autoIndex: false }
);

gameSchema.index({ bookingId: 1 }, { unique: true });

const bookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
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

export const bookingModel = model("Booking", bookingSchema);
export const gameModel = model("Game", gameSchema);
export const venueModel = model("Venue", venueSchema);
export const userModel = model("user", userSchema);
