export const BOOKING_TIME_ZONE = "Asia/Kolkata";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseBookingDate(dateValue) {
  if (typeof dateValue !== "string") return null;
  const match = DATE_ONLY_PATTERN.exec(dateValue);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { dateKey: dateValue, year, month, day, utcDate: date };
}

export function dateKeyInTimeZone(date, timeZone = BOOKING_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function minutesInTimeZone(date, timeZone = BOOKING_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function addCalendarDays(dateKey, days) {
  const parsed = parseBookingDate(dateKey);
  if (!parsed) throw new RangeError("Invalid booking date");
  parsed.utcDate.setUTCDate(parsed.utcDate.getUTCDate() + days);
  return parsed.utcDate.toISOString().slice(0, 10);
}

export function dateRangeForBooking(dateKey) {
  const parsed = parseBookingDate(dateKey);
  if (!parsed) throw new RangeError("Invalid booking date");
  const start = parsed.utcDate;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function slotStartInTimeZone(dateKey, slot, timeZone = BOOKING_TIME_ZONE) {
  const parsed = parseBookingDate(dateKey);
  const match = typeof slot === "string" && /^([01]\d|2[0-3]):00-/.exec(slot);
  if (!parsed || !match) throw new RangeError("Invalid booking slot");

  const targetUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, Number(match[1]));
  let candidate = targetUtc;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(candidate)).map(({ type, value }) => [type, value])
    );
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    candidate += targetUtc - representedUtc;
  }

  return new Date(candidate);
}
