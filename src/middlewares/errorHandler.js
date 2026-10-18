export function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `Route not found: ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "A record with these details already exists" });
  }

  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal server error" : err.message
  });
}
