import api from "../services/api";

function GameCard({ game, refreshGames }) {

    async function handleJoin() {

        try {

            await api.post(`/games/${game._id}/join`);

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

            <button

                onClick={handleJoin}

                className="w-full mt-8 bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold text-white transition"

            >

                Join Game

            </button>

        </div>

    );

}

export default GameCard;