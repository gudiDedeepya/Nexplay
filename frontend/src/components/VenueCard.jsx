import { useNavigate } from "react-router-dom";

const fallbackImage =
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80";

const sportImages = {
    badminton:
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80",
    basketball:
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
    cricket:
        "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    football:
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
    kabaddi:
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80"
};

function VenueCard({ venue }) {

    const navigate = useNavigate();
    const sportImage =
        sportImages[venue.sport?.toLowerCase()] || fallbackImage;
    const image = venue.image?.trim() || sportImage;

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition">

            <img
                src={image}
                alt={`${venue.sport} venue: ${venue.name}`}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackImage;
                }}
                className="h-52 w-full bg-slate-800 object-cover"
            />

            <div className="p-6">

                <h2 className="text-2xl font-bold text-white">

                    {venue.name}

                </h2>

                <p className="text-blue-400 mt-2">

                    {venue.sport}

                </p>

                <p className="mt-2 text-sm text-amber-300" aria-label={
                    venue.reviewCount
                        ? `${venue.averageRating} out of 5 from ${venue.reviewCount} reviews`
                        : "No reviews yet"
                }>
                    {venue.reviewCount
                        ? `★ ${venue.averageRating} · ${venue.reviewCount} ${venue.reviewCount === 1 ? "review" : "reviews"}`
                        : "No reviews yet"}
                </p>

                <p className="text-gray-400 mt-2">

                    📍 {venue.location}

                </p>

                <p className="text-white mt-3 text-lg font-semibold">

                    ₹ {venue.pricePerHour} / hour

                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/venues/${venue._id}`)}
                        className="rounded-xl border border-slate-700 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                        Details & reviews
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/book/${venue._id}`)}
                        className="rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Book now
                    </button>
                </div>

            </div>

        </div>

    );

}

export default VenueCard;