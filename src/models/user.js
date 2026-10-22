import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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

export const userModel = mongoose.models.User || mongoose.model("User", userSchema);
