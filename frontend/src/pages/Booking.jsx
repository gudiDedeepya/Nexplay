import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { addBookingDays, bookingDateKey } from "../utils/bookingDates";

function Booking() {

    const { venueId } = useParams();
    const navigate = useNavigate();

    const [venue, setVenue] = useState(null);
    const [venueLoading, setVenueLoading] = useState(true);
    const [venueError, setVenueError] = useState("");
    const [venueRetryCount, setVenueRetryCount] = useState(0);

    const [date, setDate] = useState("");
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [dateSelected, setDateSelected] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState("");
    const slotsRequestId = useRef(0);
    const [bookingError, setBookingError] = useState("");
    const [bookingLoading, setBookingLoading] = useState(false);

    const today = bookingDateKey();
    const maxBookingDate = addBookingDays(today, 10);

    useEffect(() => {
        async function loadVenue() {
            setVenueLoading(true);
            setVenueError("");
            try {
                const response = await api.get(`/venues/${venueId}`);
                setVenue(response.data.venue);
            } catch (error) {
                setVenueError(
                    error.response?.data?.message ||
                    "Unable to load venue details. Check your connection and try again."
                );
            } finally {
                setVenueLoading(false);
            }
        }

        loadVenue();
    }, [venueId, venueRetryCount]);

    async function fetchAvailableSlots(selectedDate) {
        const requestId = ++slotsRequestId.current;
        setSlots([]);
        setSelectedSlot("");
        setSlotsError("");
        setSlotsLoading(true);
        try {
            const response = await api.get(
                `/venues/${venueId}/slots?date=${selectedDate}`
            );

            if (requestId === slotsRequestId.current) {
                setSlots(response.data.availableSlots);
            }
        } catch (error) {
            if (requestId === slotsRequestId.current) {
                setSlotsError(
                    error.response?.data?.message || "Unable to fetch available slots."
                );
            }
        } finally {
            if (requestId === slotsRequestId.current) {
                setSlotsLoading(false);
            }
        }
    }

    async function handleBooking() {
        if (!date) {
            setBookingError("Please select a date.");
            return;
        }

        if (!selectedSlot) {
            setBookingError("Please select a time slot.");
            return;
        }

        setBookingLoading(true);
        setBookingError("");
        try {
            const response = await api.post("/bookings", {
                venueId,
                bookingDate: date,
                slot: selectedSlot
            });
            navigate(`/booking/confirmation/${response.data.booking._id}`);
        } catch (error) {
            setBookingError(
                error.response?.data?.message || "Booking failed. Please try again."
            );
            if (date) await fetchAvailableSlots(date);
        } finally {
            setBookingLoading(false);
        }
    }

    return (

        <div className="min-h-screen bg-slate-950 text-white">

            <Navbar />

            <div className="max-w-4xl mx-auto px-8 py-12">

                <h1 className="text-4xl font-bold">

                    Book Venue

                </h1>

                {venueLoading ? (
                    <p role="status" className="mt-2 text-gray-400">Loading venue...</p>
                ) : venueError ? (
                    <div className="mt-3 text-red-300">
                        <p role="alert">{venueError}</p>
                        <button
                            type="button"
                            onClick={() => setVenueRetryCount((count) => count + 1)}
                            className="mt-2 text-sm underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-400 mt-2 text-xl">{venue?.name}</p>
                )}
                {venue && (
                    <p className="mt-2 text-sm text-slate-400">
                        ₹{venue.pricePerHour} per hour · All booking times shown in Asia/Kolkata
                    </p>
                )}

                <div className="mt-10">

                    <label className="block mb-3 text-lg">

                        Select Date

                    </label>

                    <input

                        type="date"

                        value={date}

                        min={today}

                        max={maxBookingDate}

                        disabled={!venue || venueLoading || Boolean(venueError)}

                        onChange={(e) => {
                            const selectedDate = e.target.value;
                            setDate(selectedDate);
                            setDateSelected(Boolean(selectedDate));
                            setSelectedSlot("");
                            if (selectedDate) {
                                fetchAvailableSlots(selectedDate);
                            } else {
                                slotsRequestId.current += 1;
                                setSlots([]);
                                setSlotsLoading(false);
                                setSlotsError("");
                            }
                        }}

                        className="bg-slate-900 border border-slate-700 rounded-lg p-3"

                    />

                </div>

                <div className="mt-12">

                    <h2 className="text-2xl font-semibold mb-6">

                        Available Slots

                    </h2>

                    {

                        !dateSelected ? (

                            <p className="text-gray-400">

                                Select a date to view available slots.

                            </p>

                        ) : slotsLoading ? (

                            <p role="status" className="text-gray-400">
                                Checking available slots...
                            </p>

                        ) : slotsError ? (

                            <div className="text-red-400">
                                <p>{slotsError}</p>
                                <button
                                    type="button"
                                    onClick={() => fetchAvailableSlots(date)}
                                    className="mt-2 text-sm text-blue-300 underline hover:text-blue-200"
                                >
                                    Try again
                                </button>
                            </div>

                        ) : slots.length === 0 ? (

                            <p className="text-red-400 font-semibold">

                                No slots available for this date.

                            </p>

                        ) : (

                            <div className="grid md:grid-cols-3 gap-4">

                                {slots.map((slot) => (

                                    <button

                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        aria-pressed={selectedSlot === slot}

                                        className={`p-4 rounded-xl border transition ${
                                            selectedSlot === slot
                                                ? "bg-blue-600 border-blue-600"
                                                : "bg-slate-900 border-slate-700 hover:border-blue-500"
                                        }`}

                                    >

                                        {slot}

                                    </button>

                                ))}

                            </div>

                        )

                    }

                </div>

                {selectedSlot && venue && (
                    <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <h2 className="text-lg font-semibold">Booking summary</h2>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-slate-400">Venue</dt>
                                <dd className="mt-1 font-medium">{venue.name}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Date</dt>
                                <dd className="mt-1 font-medium">{date}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Time</dt>
                                <dd className="mt-1 font-medium">{selectedSlot}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Price</dt>
                                <dd className="mt-1 font-medium">₹{venue.pricePerHour} / hour</dd>
                            </div>
                        </dl>
                    </div>
                )}

                {bookingError && (
                    <p role="alert" className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
                        {bookingError}
                    </p>
                )}

                <button
                    onClick={handleBooking}
                    disabled={bookingLoading || slotsLoading || !venue || venueLoading || Boolean(venueError) || !selectedSlot}
                    className="mt-10 rounded-xl bg-blue-600 px-8 py-4 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {bookingLoading ? "Confirming booking..." : "Confirm booking"}
                </button>

            </div>

        </div>

    );

}

export default Booking;