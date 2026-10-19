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

                <p className="text-gray-400 mt-2">

                    📍 {venue.location}

                </p>

                <p className="text-white mt-3 text-lg font-semibold">

                    ₹ {venue.pricePerHour} / hour

                </p>

                <button

    onClick={() =>
        navigate(`/book/${venue._id}`)
    }

    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-3"

>

    Book Now

</button>

            </div>

        </div>

    );

}

export default VenueCard;