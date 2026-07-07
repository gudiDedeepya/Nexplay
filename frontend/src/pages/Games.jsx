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

        }

        catch (error) {

            console.log(error);

        }

    }

    return (

        <div className="min-h-screen bg-slate-950">

            <Navbar />

            <div className="max-w-7xl mx-auto px-8 py-14">

                <div className="mb-10">

                    <h1 className="text-4xl font-bold text-white">

                        Community Games

                    </h1>

                    <p className="text-gray-400 mt-3">

                        Discover games created by players and join the action.

                    </p>

                </div>

                {

                    games.length === 0 ?

                    (

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 text-center">

                            <h2 className="text-3xl font-bold text-white">

                                No Community Games

                            </h2>

                            <p className="text-gray-400 mt-4">

                                No games are available right now.
                            </p>

                            <p className="text-gray-500 mt-2">

                                Book a venue from your profile and create the first game!

                            </p>

                        </div>

                    )

                    :

                    (

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

                            {

                                games.map((game) => (

                                    <GameCard

                                        key={game._id}

                                        game={game}

                                        refreshGames={fetchGames}

                                    />

                                ))

                            }

                        </div>

                    )

                }

            </div>

        </div>

    );

}

export default Games;