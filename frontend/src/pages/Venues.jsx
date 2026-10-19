import { useEffect, useState } from "react";
import {
    useSearchParams,
    useNavigate
} from "react-router-dom";

import api from "../services/api";
import Navbar from "../components/Navbar";
import VenueCard from "../components/VenueCard";

function Venues() {

    const [venues, setVenues] = useState([]);
    const [requestState, setRequestState] = useState({
        key: null,
        status: "loading",
        error: ""
    });
    const [retryCount, setRetryCount] = useState(0);

    const [searchParams] = useSearchParams();//reads the query params from the url 

    const navigate = useNavigate();

    const sport = searchParams.get("sport");
    const requestKey = `${sport || ""}:${retryCount}`;

    const [sportSelection, setSportSelection] = useState({
        routeSport: sport,
        value: sport || ""
    });
    const selectedSport = sportSelection.routeSport === sport
        ? sportSelection.value
        : sport || "";

    useEffect(() => {
        let active = true;

        async function loadVenues() {
            try {
                let url = "/venues";

                if (sport) {
                    url += `?sport=${encodeURIComponent(sport)}`;
                }

                const response = await api.get(url);
                if (active) {
                    setVenues(response.data.venues);
                    setRequestState({ key: requestKey, status: "loaded", error: "" });
                }
            } catch (error) {
                if (active) {
                    setRequestState({
                        key: requestKey,
                        status: "error",
                        error: error.response?.data?.message ||
                            "Unable to load venues. Check your connection and try again."
                    });
                }
            }
        }

        loadVenues();

        return () => {
            active = false;
        };
    }, [sport, requestKey]);

    const loading = requestState.key !== requestKey || requestState.status === "loading";
    const error = requestState.key === requestKey ? requestState.error : "";

    function handleSearch() {

        if (selectedSport === "") {

            navigate("/venues");

        }

        else {

            navigate(`/venues?sport=${encodeURIComponent(selectedSport)}`);

        }

    }

    return (

        <div className="min-h-screen bg-slate-950">

            <Navbar />

            <div className="max-w-7xl mx-auto px-8 py-14">

                <h1 className="text-4xl font-bold text-white">

                    Available Venues

                </h1>

                <p className="text-gray-400 mt-3">

                    {sport
                        ? `Showing ${sport} venues`
                        : "Browse all available sports venues"}

                </p>

                {/* Search Section */}

                <div className="flex flex-wrap items-center gap-4 mt-8">

                    <select

                        value={selectedSport}

                        onChange={(e) =>
                            setSportSelection({
                                routeSport: sport,
                                value: e.target.value
                            })
                        }

                        className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl"

                    >

                        <option value="">All Sports</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Football">Football</option>
                        <option value="Badminton">Badminton</option>
                        <option value="Basketball">Basketball</option>
                        <option value="Kabaddi">Kabaddi</option>

                    </select>

                    <button

                        onClick={handleSearch}

                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"

                    >

                        Search

                    </button>

                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">

                    {

                        loading ? (

                            <div role="status" className="col-span-full text-center text-gray-400 text-xl">
                                Loading venues...
                            </div>

                        ) : error ? (

                            <div className="col-span-full text-center">
                                <p role="alert" className="text-red-400 text-lg">{error}</p>
                                <button
                                    type="button"
                                    onClick={() => setRetryCount((count) => count + 1)}
                                    className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                                >
                                    Try again
                                </button>
                            </div>

                        ) : venues.length > 0 ? (

                            venues.map((venue) => (

                                <VenueCard

                                    key={venue._id}

                                    venue={venue}

                                />

                            ))

                        ) : (

                            <div className="col-span-full text-center text-gray-400 text-xl">

                                No venues found.

                            </div>

                        )

                    }

                </div>

            </div>

        </div>

    );

}

export default Venues;