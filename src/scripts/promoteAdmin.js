import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { userModel } from "../models/user.js";

dotenv.config();

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run admin:promote -- user@example.com");
  process.exitCode = 1;
} else {
  try {
    await connectDB();

    const user = await userModel.findOneAndUpdate(
      { email },
      { role: "admin" },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.error(`No account found for ${email}. Create the account before promoting it.`);
      process.exitCode = 1;
    } else {
      console.log(`Administrator access granted to ${user.email}.`);
    }
  } catch (error) {
    console.error("Failed to promote administrator:", error);
    process.exitCode = 1;
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  }
}
