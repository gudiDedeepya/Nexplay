export function normalizeVenueData(data) {
  return {
    name: data.name.trim(),
    sport: data.sport.trim(),
    location: data.location.trim(),
    pricePerHour: Number(data.pricePerHour),
    image: data.image?.trim() || "",
    images: (data.images || []).map((value) => value.trim()),
    facilities: (data.facilities || []).map((value) => value.trim()),
    amenities: (data.amenities || []).map((value) => value.trim()),
    description: data.description?.trim() || "",
    operatingHours: data.operatingHours || { open: "16:00", close: "21:00" }
  };
}
