import { useState } from "react";
import GameChatModal from "./GameChatModal";

function GameCardProfile({ game }) {
    const [chatOpen, setChatOpen] = useState(false);
    const booking = game.bookingId;
    const venue = booking?.venueId;
    const statusStyles = {
        Open: "border-emerald-800 bg-emerald-950/60 text-emerald-300",
        Full: "border-amber-800 bg-amber-950/60 text-amber-300",
        Cancelled: "border-red-800 bg-red-950/60 text-red-300"
    };

    return (
        <article className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-700/70 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                        {game.sport || "Community game"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">{game.title}</h3>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[game.status] || statusStyles.Open}`}>
                    {game.status || "Open"}
                </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
                <p className="flex gap-3">
                    <span aria-hidden="true">🏟️</span>
                    <span>{venue?.name || "Venue details unavailable"}</span>
                </p>
                {venue?.location && (
                    <p className="flex gap-3">
                        <span aria-hidden="true">📍</span>
                        <span>{venue.location}</span>
                    </p>
                )}
                {booking?.bookingDate && (
                    <p className="flex gap-3">
                        <span aria-hidden="true">📅</span>
                        <span>{new Date(booking.bookingDate).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                        })}</span>
                    </p>
                )}
                {booking?.slot && (
                    <p className="flex gap-3">
                        <span aria-hidden="true">🕒</span>
                        <span>{booking.slot}</span>
                    </p>
                )}
            </div>

            <div className="mt-auto pt-6">
                <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Players</span>
                    <span className="font-semibold text-white">
                        {game.joinedPlayers?.length || 0} / {game.maxPlayers}
                    </span>
                </div>
                <div
                    role="progressbar"
                    aria-label="Game player capacity"
                    aria-valuemin={0}
                    aria-valuemax={game.maxPlayers}
                    aria-valuenow={Math.min(game.joinedPlayers?.length || 0, game.maxPlayers || 0)}
                    className="h-2 overflow-hidden rounded-full bg-slate-800"
                >
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                            width: `${game.maxPlayers > 0
                                ? Math.min(((game.joinedPlayers?.length || 0) / game.maxPlayers) * 100, 100)
                                : 0}%`
                        }}
                    />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{game.skillLevel || "Beginner"} level</span>
                    <span>{game.joinedPlayers?.length || 0} players</span>
                </div>
                <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    Open Game Chat
                </button>
            </div>
            {chatOpen && (
                <GameChatModal game={game} onClose={() => setChatOpen(false)} />
            )}
        </article>
    );
}

export default GameCardProfile;
