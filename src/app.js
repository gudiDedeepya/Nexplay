import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import venueRoutes from "./routes/venueRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

export const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.use("/api/v1", authRoutes);
app.use("/api/v1/venues", venueRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/games", gameRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
