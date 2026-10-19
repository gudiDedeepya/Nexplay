import { venueReviewModel } from "../models/userschema.js";

export async function withVenueReviewStats(venues) {
  if (!venues.length) return [];

  const stats = await venueReviewModel.aggregate([
    { $match: { venueId: { $in: venues.map((venue) => venue._id) } } },
    {
      $group: {
        _id: "$venueId",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);
  const statsByVenueId = new Map(stats.map((item) => [item._id.toString(), item]));

  return venues.map((venue) => {
    const value = venue.toObject ? venue.toObject() : venue;
    const venueStats = statsByVenueId.get(value._id.toString());
    return {
      ...value,
      averageRating: venueStats ? Math.round(venueStats.averageRating * 10) / 10 : null,
      reviewCount: venueStats?.reviewCount || 0
    };
  });
}
