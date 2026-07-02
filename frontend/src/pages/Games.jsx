import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import GameCard from "../components/GameCard";
import api from "../services/api";

function Games() {

    const [games, setGames] = useState([]);

    useEffect(() => {

        fetchGames();

    }, []);

    async function fetchGames() {

        try {

            const response = await api.get("/games");

            setGames(response.data.games);

        } catch (error) {

            console.log(error);

        }

    }

    return (

        <div className="min-h-screen bg-slate-950">

            <Navbar />

            <div className="max-w-7xl mx-auto px-8 py-14">

                <div className="flex justify-between items-center">

                    <div>

                        <h1 className="text-4xl font-bold text-white">

                            Community Games

                        </h1>

                        <p className="text-gray-400 mt-3">

                            Join exciting games near you.

                        </p>

                    </div>

                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
                    >
                        + Create Game
                    </button>

                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">

                    {games.map((game) => (

                        <GameCard

                            key={game._id}

                            game={game}

                            refreshGames={fetchGames}

                        />

                    ))}

                </div>

            </div>

        </div>

    );

}

export default Games;