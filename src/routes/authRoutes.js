import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middlewares/authmiddleware.js";
import { getJwtSecret } from "../config/security.js";
import { userModel } from "../models/user.js";
import { validateSigninData, validateSignupData } from "../utils/validators.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many signup attempts. Please try again later." }
});
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again later." }
});

router.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    const validationError = validateSignupData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, email, password, location } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const existingUser = await userModel.findOne({ email: email.toLowerCase() });

    if (!existingUser) {
      try {
        await userModel.create({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          location: location || ""
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    return res.status(202).json({
      message: "If account creation was possible, you can now sign in."
    });
  } catch (error) {
    next(error);
  }
});

router.post("/signin", signinLimiter, async (req, res, next) => {
  try {
    const validationError = validateSigninData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { email, password } = req.body;
    const user = await userModel.findOne({ email: email.toLowerCase() });
    let passwordMatch = false;
    if (user) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      await bcrypt.hash(password, 12);
    }

    if (!user || !passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ userId: user._id }, getJwtSecret(), {
      expiresIn: "1h"
    });

    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    next(error);
  }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
