import api from "../services/api";

function BookingCard({ booking, onCreateGame, refreshBookings }) {

    async function handleCancelBooking() {

        const confirmCancel = window.confirm(
            "Are you sure you want to cancel this booking?"
        );

        if (!confirmCancel) return;

        try {

            await api.delete(`/bookings/${booking._id}`);

            alert("Booking cancelled successfully!");

            refreshBookings();

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Unable to cancel booking"
            );

        }

    }

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

            <div className="flex gap-3 mt-5">

                <button
                    onClick={() => onCreateGame(booking)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
                >
                    Create Game
                </button>

                <button
                    onClick={handleCancelBooking}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
                >
                    Cancel Booking
                </button>

            </div>

        </div>

    );

}

export default BookingCard;