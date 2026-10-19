export function getVenueSlots(operatingHours = {}) {
  const openHour = Number(operatingHours.open?.slice(0, 2) ?? 16);
  const closeHour = Number(operatingHours.close?.slice(0, 2) ?? 21);

  return Array.from({ length: Math.max(closeHour - openHour, 0) }, (_, index) => {
    const startHour = openHour + index;
    const endHour = startHour + 1;
    return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
  });
}
