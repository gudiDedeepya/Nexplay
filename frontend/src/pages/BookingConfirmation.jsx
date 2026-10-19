import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { BOOKING_TIME_ZONE, formatBookingDate } from "../utils/bookingDates";

function BookingConfirmation() {
    const { bookingId } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadBooking = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get(`/bookings/${bookingId}`);
            setBooking(response.data.booking);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to load this booking."
            );
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        let active = true;
        api.get(`/bookings/${bookingId}`)
            .then((response) => {
                if (active) setBooking(response.data.booking);
            })
            .catch((requestError) => {
                if (active) {
                    setError(
                        requestError.response?.data?.message ||
                        "Unable to load this booking."
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [bookingId]);

    async function cancelBooking() {
        if (!window.confirm("Cancel this booking? Any community game created from it will also be removed.")) {
            return;
        }
        setCancelling(true);
        setError("");
        setNotice("");
        try {
            await api.delete(`/bookings/${bookingId}`);
            setNotice("Booking cancelled. Any linked community game was also removed.");
            await loadBooking();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to cancel this booking."
            );
        } finally {
            setCancelling(false);
        }
    }

    const venue = booking?.venueId;
    const statusStyles = booking?.status === "Cancelled"
        ? "border-slate-600 bg-slate-800 text-slate-300"
        : "border-emerald-800 bg-emerald-950/60 text-emerald-300";

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />
            <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
                {loading ? (
                    <p role="status" className="text-center text-slate-300">Loading booking details...</p>
                ) : error && !booking ? (
                    <section className="rounded-3xl border border-red-900 bg-red-950/30 p-8 text-center">
                        <h1 className="text-2xl font-bold">Booking unavailable</h1>
                        <p role="alert" className="mt-3 text-red-200">{error}</p>
                        <Link to="/profile" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold">
                            Go to profile
                        </Link>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
                        <div className="border-b border-slate-800 bg-gradient-to-br from-blue-950/70 to-slate-900 p-6 sm:p-9">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                                {booking.status === "Booked" ? "Booking confirmed" : "Booking details"}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <h1 className="text-3xl font-bold sm:text-4xl">
                                    {booking.status === "Booked" ? "You’re all set!" : "Booking summary"}
                                </h1>
                                <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusStyles}`}>
                                    {booking.status}
                                </span>
                            </div>
                            <p className="mt-3 text-slate-300">
                                {booking.status === "Booked"
                                    ? "Your venue and time slot have been reserved."
                                    : "This booking was cancelled."}
                            </p>
                        </div>

                        <div className="p-6 sm:p-9">
                            <h2 className="text-xl font-semibold">{venue?.name || "Venue details unavailable"}</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {[venue?.sport, venue?.location].filter(Boolean).join(" · ")}
                            </p>

                            <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                                {[
                                    ["Date", formatBookingDate(booking.bookingDate)],
                                    ["Time", `${booking.slot} (${BOOKING_TIME_ZONE})`],
                                    ["Price", venue?.pricePerHour !== undefined
                                        ? `₹${venue.pricePerHour} / hour`
                                        : "Unavailable"],
                                    ["Booking reference", booking._id]
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                                        <dd className="mt-2 break-all font-semibold text-slate-100">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-6 rounded-2xl border border-amber-900/70 bg-amber-950/25 p-4">
                                <h3 className="font-semibold text-amber-200">Cancellation policy</h3>
                                <p className="mt-1 text-sm leading-6 text-amber-100/80">
                                    You can cancel at least 6 hours before the slot starts. After that
                                    cutoff, the booking cannot be cancelled.
                                </p>
                            </div>

                            {error && (
                                <p role="alert" className="mt-5 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
                                    {error}
                                </p>
                            )}
                            {notice && (
                                <p role="status" className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                                    {notice}
                                </p>
                            )}

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/profile"
                                    className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold transition hover:bg-blue-500"
                                >
                                    View my bookings
                                </Link>
                                {booking.cancellable && (
                                    <button
                                        type="button"
                                        onClick={cancelBooking}
                                        disabled={cancelling || loading}
                                        className="rounded-xl border border-red-900/80 bg-red-950/30 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                                    >
                                        {cancelling ? "Cancelling..." : "Cancel booking"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default BookingConfirmation;
