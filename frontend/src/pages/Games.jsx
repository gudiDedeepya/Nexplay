import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import GameCard from "../components/GameCard";
import api from "../services/api";
import PaginationControls from "../components/PaginationControls";

function Games() {
    const [games, setGames] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);
    const [loadedKey, setLoadedKey] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        const requestKey = `${page}:${refreshKey}`;
        api.get("/games", { params: { page } })
            .then((response) => {
                if (!active) return;
                setGames(response.data.games);
                setPagination(response.data.pagination);
                setError("");
            })
            .catch((requestError) => {
                if (!active) return;
                setError(
                    requestError.response?.data?.message ||
                    "Unable to load community games. Check your connection and try again."
                );
            })
            .finally(() => {
                if (active) setLoadedKey(requestKey);
            });
        return () => {
            active = false;
        };
    }, [page, refreshKey]);
    const loading = loadedKey !== `${page}:${refreshKey}`;

    function refreshGames() {
        setRefreshKey((key) => key + 1);
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

                {error ? (
                    <div className="rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center">
                        <p role="alert" className="text-red-300">{error}</p>
                        <button
                            type="button"
                            onClick={refreshGames}
                            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-500"
                        >
                            Try again
                        </button>
                    </div>
                ) : loading ? (
                    <p role="status" className="py-16 text-center text-gray-400">Loading community games...</p>
                ) : games.length === 0 ? (
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
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {games.map((game) => (
                                <GameCard key={game._id} game={game} refreshGames={refreshGames} />
                            ))}
                        </div>
                        <PaginationControls
                            pagination={pagination}
                            onPageChange={(nextPage) => setPage(nextPage)}
                        />
                    </>
                )}

            </div>

        </div>

    );

}

export default Games;