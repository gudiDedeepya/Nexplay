import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { formatBookingDate } from "../utils/bookingDates";

const fallbackImage =
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80";

function fetchVenuePageData(venueId) {
    return Promise.all([
        api.get(`/venues/${venueId}`),
        api.get(`/venues/${venueId}/reviews`)
    ]);
}

function VenueDetails() {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const [venue, setVenue] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [eligibleBookings, setEligibleBookings] = useState([]);
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [selectedImage, setSelectedImage] = useState(0);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const photos = useMemo(
        () => [...new Set([venue?.image, ...(venue?.images || [])].filter(Boolean))],
        [venue]
    );
    const pageLoading = loading || venue?._id !== venueId;

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [venueResult, reviewsResult] = await fetchVenuePageData(venueId);
            setVenue(venueResult.data.venue);
            setReviews(reviewsResult.data.reviews);
            setEligibleBookings(reviewsResult.data.eligibleBookings);
            setSelectedBookingId((current) =>
                reviewsResult.data.eligibleBookings.some((booking) => booking._id === current)
                    ? current
                    : reviewsResult.data.eligibleBookings[0]?._id || ""
            );
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to load this venue. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => {
        let active = true;
        async function loadInitialData() {
            try {
                const [venueResult, reviewsResult] = await fetchVenuePageData(venueId);
                if (!active) return;
                setVenue(venueResult.data.venue);
                setReviews(reviewsResult.data.reviews);
                setEligibleBookings(reviewsResult.data.eligibleBookings);
                setSelectedBookingId(reviewsResult.data.eligibleBookings[0]?._id || "");
                setError("");
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.message ||
                            "Unable to load this venue. Please try again."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadInitialData();
        return () => {
            active = false;
        };
    }, [venueId]);

    async function submitReview(event) {
        event.preventDefault();
        if (!selectedBookingId) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await api.post(`/venues/${venueId}/reviews`, {
                bookingId: selectedBookingId,
                rating,
                text: reviewText
            });
            setNotice("Thanks! Your review has been added.");
            setReviewText("");
            setRating(5);
            await loadData();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to submit your review. Please try again."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                <button
                    type="button"
                    onClick={() => navigate("/venues")}
                    className="mb-6 text-sm font-semibold text-blue-300 hover:text-blue-200"
                >
                    ← Back to venues
                </button>

                {pageLoading ? (
                    <div role="status" className="py-20 text-center text-slate-400">Loading venue...</div>
                ) : error && !venue ? (
                    <div className="rounded-2xl border border-red-900 bg-red-950/40 p-6 text-center">
                        <p role="alert" className="text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={loadData}
                            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold"
                        >
                            Try again
                        </button>
                    </div>
                ) : venue && venue._id === venueId && (
                    <>
                        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
                            {photos.length > 0 ? (
                                <img
                                    src={photos[selectedImage] || photos[0]}
                                    alt={`${venue.name} venue`}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = fallbackImage;
                                    }}
                                    className="h-64 w-full bg-slate-800 object-cover sm:h-[28rem]"
                                />
                            ) : (
                                <img
                                    src={fallbackImage}
                                    alt=""
                                    className="h-64 w-full bg-slate-800 object-cover sm:h-[28rem]"
                                />
                            )}
                            {photos.length > 1 && (
                                <div className="flex gap-3 overflow-x-auto border-b border-slate-800 p-4">
                                    {photos.map((photo, index) => (
                                        <button
                                            key={photo}
                                            type="button"
                                            onClick={() => setSelectedImage(index)}
                                            aria-label={`Show venue photo ${index + 1}`}
                                            aria-pressed={selectedImage === index}
                                            className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                                                selectedImage === index ? "border-blue-400" : "border-transparent"
                                            }`}
                                        >
                                            <img src={photo} alt="" className="h-16 w-24 object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
                                        {venue.sport}
                                    </p>
                                    <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{venue.name}</h1>
                                    <p className="mt-3 text-slate-300">📍 {venue.location}</p>
                                    <p className="mt-3 text-sm text-amber-300">
                                        {venue.reviewCount
                                            ? `★ ${venue.averageRating} / 5 · ${venue.reviewCount} ${venue.reviewCount === 1 ? "review" : "reviews"}`
                                            : "No reviews yet"}
                                    </p>
                                    {venue.description && (
                                        <p className="mt-5 max-w-3xl leading-7 text-slate-300">{venue.description}</p>
                                    )}
                                </div>
                                <div className="self-start rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
                                    <p className="text-sm text-slate-400">Hourly rate</p>
                                    <p className="mt-1 text-2xl font-bold">₹{venue.pricePerHour}<span className="text-sm font-normal text-slate-400"> / hour</span></p>
                                    <p className="mt-4 text-sm text-slate-400">Opening hours</p>
                                    <p className="mt-1 font-semibold">
                                        {venue.operatingHours?.open || "16:00"} – {venue.operatingHours?.close || "21:00"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/book/${venue._id}`)}
                                        className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
                                    >
                                        Book this venue
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-6 border-t border-slate-800 p-6 sm:grid-cols-2 sm:p-8">
                                {[
                                    ["Facilities", venue.facilities],
                                    ["Amenities", venue.amenities]
                                ].map(([title, items]) => (
                                    <div key={title}>
                                        <h2 className="font-semibold">{title}</h2>
                                        {items?.length ? (
                                            <ul className="mt-3 flex flex-wrap gap-2">
                                                {items.map((item) => (
                                                    <li key={item} className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-500">Not listed</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
                            <div>
                                <h2 className="text-2xl font-bold">Player reviews</h2>
                                <div className="mt-5 space-y-4">
                                    {reviews.length ? reviews.map((review) => (
                                        <article key={review._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold">{review.userId?.name || "Player"}</p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {formatBookingDate(review.createdAt)}
                                                    </p>
                                                </div>
                                                <span className="whitespace-nowrap text-amber-300" aria-label={`${review.rating} out of 5 stars`}>
                                                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                                </span>
                                            </div>
                                            {review.text && <p className="mt-4 leading-6 text-slate-300">{review.text}</p>}
                                        </article>
                                    )) : (
                                        <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
                                            No reviews yet. Be the first to review after a completed booking.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={submitReview} className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                                <h2 className="text-xl font-bold">Write a review</h2>
                                {eligibleBookings.length ? (
                                    <>
                                        <label className="mt-5 block text-sm font-medium text-slate-300">
                                            Completed booking
                                            <select
                                                value={selectedBookingId}
                                                onChange={(event) => setSelectedBookingId(event.target.value)}
                                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                                            >
                                                {eligibleBookings.map((booking) => (
                                                    <option key={booking._id} value={booking._id}>
                                                        {formatBookingDate(booking.bookingDate)} · {booking.slot}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <fieldset className="mt-5">
                                            <legend className="text-sm font-medium text-slate-300">Your rating</legend>
                                            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Your rating">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={rating === value}
                                                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                                                        onClick={() => setRating(value)}
                                                        className={`text-3xl ${rating >= value ? "text-amber-300" : "text-slate-600"}`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </fieldset>
                                        <label className="mt-5 block text-sm font-medium text-slate-300">
                                            Comment <span className="font-normal text-slate-500">— optional</span>
                                            <textarea
                                                value={reviewText}
                                                onChange={(event) => setReviewText(event.target.value)}
                                                maxLength={1000}
                                                rows="4"
                                                placeholder="How was your experience?"
                                                className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500"
                                            />
                                        </label>
                                        <p className="mt-1 text-right text-xs text-slate-500">{reviewText.length}/1000</p>
                                        <button
                                            type="submit"
                                            disabled={saving || !selectedBookingId}
                                            className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {saving ? "Submitting..." : "Submit review"}
                                        </button>
                                    </>
                                ) : (
                                    <p className="mt-4 text-sm leading-6 text-slate-400">
                                        Reviews are available after one of your bookings at this venue has finished. Each completed booking can be reviewed once.
                                    </p>
                                )}
                                {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}
                                {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
                            </form>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default VenueDetails;
