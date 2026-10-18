import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middlewares/authmiddleware.js";
import { getJwtSecret } from "../config/security.js";
import { userModel } from "../models/userschema.js";
import { validateSigninData, validateSignupData } from "../utils/validators.js";

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const validationError = validateSignupData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, email, password, location } = req.body;
    const existingUser = await userModel.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(403).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      location: location || ""
    });

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/signin", async (req, res, next) => {
  try {
    const validationError = validateSigninData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { email, password } = req.body;
    const user = await userModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, getJwtSecret(), {
      expiresIn: "7d"
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
