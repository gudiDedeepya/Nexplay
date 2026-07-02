import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function Booking() {

    const { venueId } = useParams();
    const navigate = useNavigate();

    const [date, setDate] = useState("");
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [dateSelected, setDateSelected] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 10);
    const maxBookingDate = maxDate.toISOString().split("T")[0];

    async function fetchAvailableSlots(selectedDate) {

        try {

            const response = await api.get(
                `/venues/${venueId}/slots?date=${selectedDate}`
            );

            setSlots(response.data.availableSlots);

            setSelectedSlot("");

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Unable to fetch slots"
            );

        }

    }

    async function handleBooking() {

        if (!date) {
            alert("Please select a date");
            return;
        }

        if (!selectedSlot) {
            alert("Please select a slot");
            return;
        }

        try {

            await api.post("/bookings", {
                venueId,
                bookingDate: date,
                slot: selectedSlot
            });

            alert("Venue booked successfully!");

            navigate("/profile");

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Booking failed"
            );

        }

    }

    return (

        <div className="min-h-screen bg-slate-950 text-white">

            <Navbar />

            <div className="max-w-4xl mx-auto px-8 py-12">

                <h1 className="text-4xl font-bold">
                    Book Venue
                </h1>

                <p className="text-gray-400 mt-2">
                    Venue ID: {venueId}
                </p>

                <div className="mt-10">

                    <label className="block mb-3 text-lg">
                        Select Date
                    </label>

                    <input
                        type="date"
                        value={date}
                        min={today}
                        max={maxBookingDate}
                        onChange={(e) => {

                            setDate(e.target.value);
                            setDateSelected(true);
                            fetchAvailableSlots(e.target.value);

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

                <button

                    onClick={handleBooking}

                    className="mt-10 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold"

                >

                    Book Venue

                </button>

            </div>

        </div>

    );

}

export default Booking;