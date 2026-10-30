import api from "../services/api";
import { useState } from "react";
import GameChatModal from "./GameChatModal";
import { useGameChat } from "../hooks/useGameChat";
import { formatBookingDate } from "../utils/bookingDates";
import { getUserIdFromToken } from "../utils/jwt";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";

function GameCard({ game, refreshGames }) {
    const [chatOpen, setChatOpen] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const { token } = useContext(AuthContext);
    const currentUserId = getUserIdFromToken(token || "");
    const { unreadCounts, refreshMembership } = useGameChat();
    const unreadCount = unreadCounts[game._id] || 0;

    async function handleJoin() {

        try {

            await api.post(`/games/${game._id}/join`);
            await refreshMembership();

            alert("Joined Game Successfully!");

            refreshGames();

        }

        catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Unable to join game"
            );

        }

    }

    async function handleLeave() {
        if (!window.confirm(`Leave "${game.title}"? You will lose access to its game chat.`)) return;
        setLeaving(true);
        try {
            await api.delete(`/games/${game._id}/leave`);
            await refreshMembership();
            refreshGames();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to leave this game.");
        } finally {
            setLeaving(false);
        }
    }

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">

            <h2 className="text-2xl font-bold text-white">

                {game.title}

            </h2>

            <p className="text-blue-400 mt-3">

                {game.sport}

            </p>

            <div className="mt-5 space-y-2 text-gray-300">

                <p>

                    <span className="font-semibold">
                        {game.bookingId?.venueId?.name}
                    </span>

                </p>

                <p>

                    {game.bookingId?.venueId?.location}

                </p>

                <p>

                    {formatBookingDate(game.bookingId?.bookingDate)}

                </p>

                <p>

                    {game.bookingId?.slot}

                </p>

                <p>

                    Organizer :
                    {" "}
                    <span className="font-semibold">

                        {game.organizerId?.name}

                    </span>

                </p>

                <p>

                    Players :
                    {" "}
                    {game.joinedPlayers.length}
                    {" / "}
                    {game.maxPlayers}

                </p>

                <p>

                    Skill :
                    {" "}
                    {game.skillLevel}

                </p>

                <p>

                    Status :
                    {" "}
                    <span className="text-green-400">

                        {game.status}

                    </span>

                </p>

            </div>

            {

                game.description &&

                <div className="mt-5">

                    <p className="text-gray-400">

                        {game.description}

                    </p>

                </div>

            }

            <div className="mt-8 flex gap-3">
                {game.joinedByMe ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setChatOpen(true)}
                            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
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
                        {(game.organizerId?._id || game.organizerId?.toString()) !== currentUserId && (
                            <button
                                type="button"
                                onClick={handleLeave}
                                disabled={leaving}
                                className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 font-semibold text-red-300 disabled:opacity-50"
                            >
                                {leaving ? "Leaving..." : "Leave game"}
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={handleJoin}
                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Join Game
                    </button>
                )}
            </div>
            {chatOpen && (
                <GameChatModal game={game} onClose={() => setChatOpen(false)} />
            )}

        </div>

    );

}

export default GameCard;