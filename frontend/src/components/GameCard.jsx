//import { useNavigate } from "react-router-dom";
import api from "../services/api";

function GameCard({ game, refreshGames }) {

    async function handleJoin() {

        try {

            await api.post(`/games/${game._id}/join`);

            alert("Joined Game Successfully!");

            refreshGames();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to join game"
            );

        }

    }

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">

            <img
                src="https://placehold.co/600x350?text=Game"
                alt={game.title}
                className="w-full h-52 object-cover"
            />

            <div className="p-6">

                <h2 className="text-2xl font-bold text-white">
                    {game.title}
                </h2>

                <p className="text-blue-400 mt-2">
                    {game.sport}
                </p>

                {/* <p className="text-gray-400 mt-2">
                    📍 {game.location}
                </p> */}

                <p className="text-gray-400 mt-2">
                    📅 {new Date(game.date).toLocaleDateString()}
                </p>

                <p className="text-white mt-3 font-semibold">
                    👥 {game.joinedPlayers.length} / {game.maxPlayers} / {game.maxPlayers}
                </p>

                <button
                    onClick={handleJoin}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
                >
                    Join Game
                </button>

            </div>

        </div>

    );

}

export default GameCard;