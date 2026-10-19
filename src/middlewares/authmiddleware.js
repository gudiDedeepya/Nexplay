import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/security.js";
import { userModel } from "../models/userschema.js";

export function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing or invalid" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], getJwtSecret());
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next();
    }

    return next(error);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await userModel.findById(req.userId).select("role");

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
