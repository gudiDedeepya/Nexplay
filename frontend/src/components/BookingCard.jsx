function BookingCard({ booking, onCreateGame }) {

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold text-white">

                {booking.venueId.name}

            </h2>

            <p className="text-blue-400 mt-2">

                {booking.venueId.sport}

            </p>

            <p className="text-gray-400 mt-2">

                📍 {booking.venueId.location}

            </p>

            <p className="text-gray-400 mt-2">

                📅 {new Date(booking.bookingDate).toLocaleDateString()}

            </p>

            <p className="text-gray-400 mt-2">

                🕒 {booking.slot}

            </p>

            <p className="text-green-400 mt-2">

                {booking.status}

            </p>

            <button

                onClick={() => onCreateGame(booking)}

                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"

            >

                Create Game

            </button>

        </div>

    );

}

export default BookingCard;