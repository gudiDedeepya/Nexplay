import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../services/api";
import Navbar from "../components/Navbar";
import VenueCard from "../components/VenueCard";

function Venues() {

    const [venues, setVenues] = useState([]);

    const [searchParams] = useSearchParams();

    const sport = searchParams.get("sport");

    useEffect(() => {

        fetchVenues();

    }, [sport]);

    async function fetchVenues() {

        try {

            let url = "/venues";

            if (sport) {

                url += `?sport=${sport}`;

            }

            const response = await api.get(url);

            setVenues(response.data.venues);

        }

        catch (error) {

            console.log(error);

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

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">

                    {venues.map((venue) => (

                        <VenueCard
                            key={venue._id}
                            venue={venue}
                        />

                    ))}

                </div>

            </div>

        </div>

    );

}

export default Venues;