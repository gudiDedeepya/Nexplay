import { useState } from "react";
import GameChatModal from "./GameChatModal";
import { useGameChat } from "../hooks/useGameChat";
import { formatBookingDate } from "../utils/bookingDates";
import api from "../services/api";

function GameCardProfile({ game, canLeave = false, onLeave }) {
    const [chatOpen, setChatOpen] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [leaveError, setLeaveError] = useState("");
    const { unreadCounts, refreshMembership } = useGameChat();
    const unreadCount = unreadCounts[game._id] || 0;
    const booking = game.bookingId;
    const venue = booking?.venueId;
    const statusStyles = {
        Open: "border-emerald-800 bg-emerald-950/60 text-emerald-300",
        Full: "border-amber-800 bg-amber-950/60 text-amber-300",
        Cancelled: "border-red-800 bg-red-950/60 text-red-300"
    };

    async function leaveGame() {
        if (!window.confirm(`Leave "${game.title}"? You will lose access to its game chat.`)) {
            return;
        }

        setLeaving(true);
        setLeaveError("");
        try {
            await api.delete(`/games/${game._id}/leave`);
            await refreshMembership();
            await onLeave?.();
        } catch (error) {
            setLeaveError(error.response?.data?.message || "Unable to leave this game.");
        } finally {
            setLeaving(false);
        }
    }

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
                        <span>{formatBookingDate(booking.bookingDate)}</span>
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
                {leaveError && (
                    <p role="alert" className="mt-3 text-sm text-red-300">{leaveError}</p>
                )}
                <div className={`mt-5 grid gap-3 ${canLeave ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    <button
                        type="button"
                        onClick={() => setChatOpen(true)}
                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            Open Game Chat
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </span>
                    </button>
                    {canLeave && (
                        <button
                            type="button"
                            onClick={leaveGame}
                            disabled={leaving}
                            className="w-full rounded-xl border border-red-900/80 bg-red-950/30 py-3 font-semibold text-red-300 transition hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {leaving ? "Leaving game..." : "Leave game"}
                        </button>
                    )}
                </div>
            </div>
            {chatOpen && (
                <GameChatModal game={game} onClose={() => setChatOpen(false)} />
            )}
        </article>
    );
}

export default GameCardProfile;
