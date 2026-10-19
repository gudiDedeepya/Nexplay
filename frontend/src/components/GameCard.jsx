import api from "../services/api";
import { useState } from "react";
import GameChatModal from "./GameChatModal";
import { useGameChat } from "../hooks/useGameChat";

function GameCard({ game, refreshGames }) {
    const [chatOpen, setChatOpen] = useState(false);
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

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">

            <h2 className="text-2xl font-bold text-white">

                🏏 {game.title}

            </h2>

            <p className="text-blue-400 mt-3">

                {game.sport}

            </p>

            <div className="mt-5 space-y-2 text-gray-300">

                <p>

                    🏟️ <span className="font-semibold">
                        {game.bookingId?.venueId?.name}
                    </span>

                </p>

                <p>

                    📍 {game.bookingId?.venueId?.location}

                </p>

                <p>

                    📅 {new Date(game.bookingId?.bookingDate).toLocaleDateString()}

                </p>

                <p>

                    🕒 {game.bookingId?.slot}

                </p>

                <p>

                    👤 Organizer :
                    {" "}
                    <span className="font-semibold">

                        {game.organizerId?.name}

                    </span>

                </p>

                <p>

                    👥 Players :
                    {" "}
                    {game.joinedPlayers.length}
                    {" / "}
                    {game.maxPlayers}

                </p>

                <p>

                    🎯 Skill :
                    {" "}
                    {game.skillLevel}

                </p>

                <p>

                    🟢 Status :
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

                        📝 {game.description}

                    </p>

                </div>

            }

            <div className="mt-8 flex gap-3">
                {game.joinedByMe ? (
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