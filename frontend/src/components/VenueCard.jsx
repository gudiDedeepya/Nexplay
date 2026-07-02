import { useNavigate } from "react-router-dom";

function VenueCard({ venue }) {

    const navigate = useNavigate();

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition">

            <img
                src="https://placehold.co/600x350?text=Sports+Venue"
                alt={venue.name}
                className="w-full h-52 object-cover"
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