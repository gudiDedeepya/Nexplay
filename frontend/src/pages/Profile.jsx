import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import BookingCard from "../components/BookingCard";
import GameCardProfile from "../components/GameCardProfile";
import CreateGameModal from "../components/CreateGameModal";
import api from "../services/api";

const sections = [
    { id: "bookings", label: "Bookings" },
    { id: "created", label: "Created games" },
    { id: "joined", label: "Joined games" }
];

function fetchDashboardData() {
    return Promise.allSettled([
        api.get("/me"),
        api.get("/bookings/my-bookings"),
        api.get("/games/my-games"),
        api.get("/games/joined-games")
    ]);
}

function Profile() {
    const [user, setUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [myGames, setMyGames] = useState([]);
    const [joinedGames, setJoinedGames] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [activeSection, setActiveSection] = useState("bookings");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");
        const results = await fetchDashboardData();
        const [profileResult, bookingsResult, createdResult, joinedResult] = results;

        if (profileResult.status === "fulfilled") {
            setUser(profileResult.value.data.user);
        }
        if (bookingsResult.status === "fulfilled") {
            setBookings(bookingsResult.value.data.bookings);
        }
        if (createdResult.status === "fulfilled") {
            setMyGames(createdResult.value.data.games);
        }
        if (joinedResult.status === "fulfilled") {
            setJoinedGames(joinedResult.value.data.games);
        }

        if (results.some((result) => result.status === "rejected")) {
            setError("Some dashboard information could not be loaded. Try again.");
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadInitialDashboard() {
            const results = await fetchDashboardData();
            if (cancelled) return;

            const [profileResult, bookingsResult, createdResult, joinedResult] = results;

            if (profileResult.status === "fulfilled") {
                setUser(profileResult.value.data.user);
            }
            if (bookingsResult.status === "fulfilled") {
                setBookings(bookingsResult.value.data.bookings);
            }
            if (createdResult.status === "fulfilled") {
                setMyGames(createdResult.value.data.games);
            }
            if (joinedResult.status === "fulfilled") {
                setJoinedGames(joinedResult.value.data.games);
            }

            if (results.some((result) => result.status === "rejected")) {
                setError("Some dashboard information could not be loaded. Try again.");
            }

            setLoading(false);
        }

        loadInitialDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    const displayName = user?.name || "Player";
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

    const activeItems = {
        bookings,
        created: myGames,
        joined: joinedGames
    }[activeSection];

    const emptyStates = {
        bookings: {
            title: "No bookings yet",
            description: "Find a venue and reserve a time slot to get started.",
            action: "Explore venues",
            to: "/venues"
        },
        created: {
            title: "No games created yet",
            description: "Create a community game from one of your bookings.",
            action: "View bookings",
            section: "bookings"
        },
        joined: {
            title: "No games joined yet",
            description: "Browse community games and find a match that suits you.",
            action: "Explore games",
            to: "/games"
        }
    };
    const emptyState = emptyStates[activeSection];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 sm:p-9">
                    <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-950/50 sm:h-20 sm:w-20 sm:text-3xl">
                                {initials || "P"}
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                                    Player dashboard
                                </p>
                                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                                    {displayName}
                                </h1>
                                <p className="mt-2 break-all text-sm text-slate-300 sm:text-base">
                                    {user?.email || "Your NexPlay account"}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    {user?.location || "Add a location to your profile"}
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/venues"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            Find a venue
                        </Link>
                    </div>
                </section>

                <section aria-label="Dashboard summary" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        { label: "Active bookings", value: bookings.filter((booking) => booking.status === "Booked").length, icon: "📅" },
                        { label: "Games created", value: myGames.length, icon: "🏆" },
                        { label: "Games joined", value: joinedGames.length, icon: "🤝" }
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                <span aria-hidden="true" className="text-xl">{stat.icon}</span>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-white">
                                {loading ? <span className="text-slate-600">—</span> : stat.value}
                            </p>
                        </div>
                    ))}
                </section>

                {error && (
                    <div role="alert" className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-800/70 bg-amber-950/40 p-4 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={loadDashboard}
                            className="self-start font-semibold underline underline-offset-4 hover:text-white sm:self-auto"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <section className="mt-10">
                    <div className="flex flex-col gap-4 border-b border-slate-800 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold sm:text-3xl">Your activity</h2>
                            <p className="mt-2 text-sm text-slate-400">
                                Keep track of your bookings and games in one place.
                            </p>
                        </div>

                        <div role="tablist" aria-label="Dashboard activity" className="flex gap-2 overflow-x-auto pb-3">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    id={`profile-tab-${section.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeSection === section.id}
                                    aria-controls="profile-activity-panel"
                                    onClick={() => setActiveSection(section.id)}
                                    className={`shrink-0 rounded-t-lg border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                                        activeSection === section.id
                                            ? "border-blue-500 text-blue-300"
                                            : "border-transparent text-slate-400 hover:text-white"
                                    }`}
                                >
                                    {section.label}
                                    <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                                        {section.id === "bookings"
                                            ? bookings.length
                                            : section.id === "created"
                                                ? myGames.length
                                                : joinedGames.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div
                        id="profile-activity-panel"
                        role="tabpanel"
                        aria-labelledby={`profile-tab-${activeSection}`}
                        className="pt-6"
                    >
                        {loading ? (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading dashboard activity">
                                {[0, 1, 2].map((item) => (
                                    <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
                                ))}
                            </div>
                        ) : activeItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
                                <p className="text-4xl" aria-hidden="true">
                                    {activeSection === "bookings" ? "📍" : activeSection === "created" ? "🎮" : "🤝"}
                                </p>
                                <h3 className="mt-4 text-xl font-bold">{emptyState.title}</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                                    {emptyState.description}
                                </p>
                                {emptyState.to ? (
                                    <Link
                                        to={emptyState.to}
                                        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                                    >
                                        {emptyState.action}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(emptyState.section)}
                                        className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                                    >
                                        {emptyState.action}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {activeSection === "bookings"
                                    ? bookings.map((booking) => (
                                        <BookingCard
                                            key={booking._id}
                                            booking={booking}
                                            onCreateGame={setSelectedBooking}
                                            refreshBookings={loadDashboard}
                                        />
                                    ))
                                    : activeItems.map((game) => (
                                        <GameCardProfile key={game._id} game={game} />
                                    ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {selectedBooking && (
                <CreateGameModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onSuccess={loadDashboard}
                />
            )}
        </div>
    );
}

export default Profile;
