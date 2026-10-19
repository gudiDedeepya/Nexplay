import { useState } from "react";
import api from "../services/api";
import { formatBookingDate } from "../utils/bookingDates";

function BookingCard({ booking, onCreateGame, refreshBookings }) {
    const [cancelling, setCancelling] = useState(false);

    async function handleCancelBooking() {
        const confirmCancel = window.confirm(
            "You can cancel only at least 6 hours before the slot starts. Any game created from it will also be removed. Continue?"
        );

        if (!confirmCancel) return;

        setCancelling(true);

        try {
            await api.delete(`/bookings/${booking._id}`);
            await refreshBookings();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Unable to cancel booking");
        } finally {
            setCancelling(false);
        }
    }

    const venue = booking.venueId;

    return (
        <article className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-700/70 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                        {venue?.sport || "Venue"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">
                        {venue?.name || "Venue details unavailable"}
                    </h3>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    booking.status === "Cancelled"
                        ? "border-slate-600 bg-slate-800 text-slate-300"
                        : "border-emerald-800 bg-emerald-950/60 text-emerald-300"
                }`}>
                    {booking.status}
                </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
                {venue?.location && (
                    <p className="flex gap-3">
                        <span aria-hidden="true">📍</span>
                        <span>{venue.location}</span>
                    </p>
                )}
                <p className="flex gap-3">
                    <span aria-hidden="true">📅</span>
                    <span>{formatBookingDate(booking.bookingDate)}</span>
                </p>
                <p className="flex gap-3">
                    <span aria-hidden="true">🕒</span>
                    <span>{booking.slot}</span>
                </p>
                {venue?.pricePerHour !== undefined && (
                    <p className="flex gap-3">
                        <span aria-hidden="true">💳</span>
                        <span>₹{venue.pricePerHour} / hour</span>
                    </p>
                )}
            </div>

            {booking.status === "Booked" && (
                <>
                    <p className="mt-5 text-xs leading-5 text-slate-500">
                        Cancellation is available at least 6 hours before the slot starts.
                    </p>
                    <div className="mt-auto grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => onCreateGame(booking)}
                            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            Create a game
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelBooking}
                            disabled={cancelling || !booking.cancellable}
                            title={!booking.cancellable ? "Cancellation window has closed" : undefined}
                            className="rounded-xl border border-red-900/80 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {cancelling
                                ? "Cancelling..."
                                : booking.cancellable
                                    ? "Cancel booking"
                                    : "Cancellation closed"}
                        </button>
                    </div>
                </>
            )}
        </article>
    );
}

export default BookingCard;
