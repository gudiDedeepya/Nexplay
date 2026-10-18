export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSignupData({ name, email, password, location }) {
  if (!isNonEmptyString(name)) {
    return "Name is required.";
  }

  if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A valid email is required.";
  }

  if (!isNonEmptyString(password) || password.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  if (location !== undefined && location !== null && !isNonEmptyString(location)) {
    return "Location cannot be empty.";
  }

  return null;
}

export function validateSigninData({ email, password }) {
  if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A valid email is required.";
  }

  if (!isNonEmptyString(password) || password.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  return null;
}

export function validateVenueData({ name, sport, location, pricePerHour }) {
  if (!isNonEmptyString(name)) {
    return "Venue name is required.";
  }

  if (!isNonEmptyString(sport)) {
    return "Sport is required.";
  }

  if (!isNonEmptyString(location)) {
    return "Venue location is required.";
  }

  if (pricePerHour === undefined || pricePerHour === null || Number(pricePerHour) <= 0) {
    return "Price per hour must be a positive number.";
  }

  return null;
}

export function validateBookingData({ venueId, bookingDate, slot }) {
  if (!venueId || typeof venueId !== "string") {
    return "Venue ID is required.";
  }

  if (!isNonEmptyString(bookingDate)) {
    return "Booking date is required.";
  }

  const parsedDate = new Date(bookingDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Booking date is invalid.";
  }

  if (!isNonEmptyString(slot)) {
    return "Slot is required.";
  }

  return null;
}

export function validateGameData({ title, maxPlayers, skillLevel, description }) {
  if (!isNonEmptyString(title)) {
    return "Game title is required.";
  }

  if (!Number.isInteger(Number(maxPlayers)) || Number(maxPlayers) < 2) {
    return "Maximum players must be at least 2, including the organizer.";
  }

  if (skillLevel && !["Beginner", "Intermediate", "Advanced"].includes(skillLevel)) {
    return "Skill level is invalid.";
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return "Description must be a string.";
  }

  return null;
}
