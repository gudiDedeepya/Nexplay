export function filterVenuesByPrice(venues, minPrice = "", maxPrice = "", search = "") {
    const minimum = minPrice === "" ? null : Number(minPrice);
    const maximum = maxPrice === "" ? null : Number(maxPrice);
    const searchTerm = search.trim().toLocaleLowerCase();

    return venues.filter((venue) => {
        const price = Number(venue.pricePerHour);
        const searchableText = `${venue.name || ""} ${venue.location || ""}`.toLocaleLowerCase();
        return (
            Number.isFinite(price) &&
            (minimum === null || price >= minimum) &&
            (maximum === null || price <= maximum) &&
            (!searchTerm || searchableText.includes(searchTerm))
        );
    });
}
