const localJwtSecret = "nexplay-local-development-only-secret";

export function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }

  return localJwtSecret;
}

export function validateRuntimeConfig() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  getJwtSecret();

  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === localJwtSecret) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured in production");
  }

  if (!process.env.FRONTEND_ORIGIN) {
    throw new Error("FRONTEND_ORIGIN must be configured in production");
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL must be configured for shared chat rate limits in production");
  }

}
