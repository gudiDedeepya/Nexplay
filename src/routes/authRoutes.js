import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middlewares/authmiddleware.js";
import { getJwtSecret } from "../config/security.js";
import { userModel } from "../models/user.js";
import { validateSigninData, validateSignupData } from "../utils/validators.js";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes } from "node:crypto";
import { sendVerificationEmail } from "../services/emailService.js";

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
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Please try again later." }
});

function newVerificationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

export async function resetAuthRateLimitsForTests() {
  await Promise.all(
    [signupLimiter, signinLimiter, verificationLimiter]
      .map((limiter) => limiter.resetKey("127.0.0.1"))
  );
}

router.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    const validationError = validateSignupData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { name, email, password, location } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedEmail = email.toLowerCase();
    let user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      try {
        user = await userModel.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          location: location || "",
          emailVerified: false
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        user = await userModel.findOne({ email: normalizedEmail });
      }
    }

    if (user && !user.emailVerified) {
      const verification = newVerificationToken();
      await userModel.updateOne(
        { _id: user._id, emailVerified: false },
        {
          $set: {
            verificationTokenHash: verification.tokenHash,
            verificationTokenExpiresAt: verification.expiresAt
          }
        }
      );
      try {
        await sendVerificationEmail({ to: normalizedEmail, token: verification.token });
      } catch (error) {
        console.error("Unable to send account verification email:", error);
        return res.status(503).json({
          message: "Unable to send a verification email right now. Please try again later."
        });
      }
    }

    return res.status(202).json({
      message: "If this email can be registered, a verification email has been sent. Existing account holders can sign in."
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", verificationLimiter, async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
      return res.status(400).json({ message: "This verification link is invalid or expired." });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await userModel.findOneAndUpdate(
      {
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: { $gt: new Date() },
        emailVerified: false
      },
      {
        $set: { emailVerified: true },
        $unset: { verificationTokenHash: 1, verificationTokenExpiresAt: 1 }
      },
      { returnDocument: "after" }
    );
    if (!user) {
      return res.status(400).json({ message: "This verification link is invalid or expired." });
    }

    return res.status(200).json({ message: "Email verified. You can now sign in." });
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

    if (!user || !passwordMatch || !user.emailVerified) {
      return res.status(401).json({
        message: "Invalid email or password, or email verification is still pending."
      });
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
