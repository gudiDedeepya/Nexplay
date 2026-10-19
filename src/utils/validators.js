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

export function validateVenueData({
  name,
  sport,
  location,
  pricePerHour,
  operatingHours,
  image,
  description
}) {
  if (!isNonEmptyString(name)) {
    return "Venue name is required.";
  }

  if (!isNonEmptyString(sport)) {
    return "Sport is required.";
  }

  if (!isNonEmptyString(location)) {
    return "Venue location is required.";
  }

  if (
    pricePerHour === undefined ||
    pricePerHour === null ||
    !Number.isFinite(Number(pricePerHour)) ||
    Number(pricePerHour) <= 0
  ) {
    return "Price per hour must be a positive number.";
  }

  if (image !== undefined && image !== "" && !isNonEmptyString(image)) {
    return "Venue image URL must be a string.";
  }

  if (description !== undefined && typeof description !== "string") {
    return "Venue description must be a string.";
  }

  if (operatingHours !== undefined) {
    const timeToMinutes = (value) => {
      if (typeof value !== "string" || !/^([01]\d|2[0-3]):00$/.test(value)) {
        return null;
      }
      return Number(value.slice(0, 2)) * 60;
    };

    const openMinutes = timeToMinutes(operatingHours?.open);
    const closeMinutes = timeToMinutes(operatingHours?.close);
    if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
      return "Operating hours must be whole-hour times, with closing after opening.";
    }
  }

  return null;
}

export function validateBookingData({ venueId, bookingDate, slot }) {
  const dateMatch =
    typeof bookingDate === "string" &&
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(bookingDate);
  if (typeof venueId !== "string" || !/^[a-f\d]{24}$/i.test(venueId)) {
    return "A valid venue ID is required.";
  }

  if (!dateMatch) {
    return "Booking date must use YYYY-MM-DD format.";
  }

  const [, year, month, day] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
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
