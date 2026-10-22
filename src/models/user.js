import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpiresAt: { type: Date, select: false },
    location: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    sports: [String]
  },
  { timestamps: true }
);

export const userModel = mongoose.models.User || mongoose.model("User", userSchema);
