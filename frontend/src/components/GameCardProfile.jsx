function GameCardProfile({ game }) {

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">

            <h2 className="text-2xl font-bold text-white">

                {game.title}

            </h2>

            <p className="text-blue-400 mt-2">

                🏏 {game.sport}

            </p>

            <p className="text-gray-400 mt-2">

                🏟️ {game.bookingId.venueId.name}

            </p>

            <p className="text-gray-400 mt-2">

                📍 {game.bookingId.venueId.location}

            </p>

            <p className="text-gray-400 mt-2">

                👥 {game.joinedPlayers.length} / {game.maxPlayers}

            </p>

            <p className="text-gray-400 mt-2">

                🎯 {game.skillLevel}

            </p>

            <p className="mt-3">

                <span className="text-green-400">

                    {game.status}

                </span>

            </p>

        </div>

    );

}

export default GameCardProfile;