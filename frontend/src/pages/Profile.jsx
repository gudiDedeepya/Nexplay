import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import BookingCard from "../components/BookingCard";
import GameCardProfile from "../components/GameCardProfile";
import CreateGameModal from "../components/CreateGameModal";
import api from "../services/api";

function Profile() {

    const [user, setUser] = useState(null);

    const [bookings, setBookings] = useState([]);

    const [myGames, setMyGames] = useState([]);

    const [joinedGames, setJoinedGames] = useState([]);

    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {

        fetchProfile();

        fetchBookings();

        fetchMyGames();

        fetchJoinedGames();

    }, []);

    async function fetchProfile() {

        try {

            const response = await api.get("/me");

            setUser(response.data.user);

        }

        catch (error) {

            console.log(error);

        }

    }

    async function fetchBookings() {

        try {

            const response = await api.get("/my-bookings");

            setBookings(response.data.bookings);

        }

        catch (error) {

            console.log(error);

        }

    }

    async function fetchMyGames() {

        try {

            const response = await api.get("/my-games");

            setMyGames(response.data.games);

        }

        catch (error) {

            console.log(error);

        }

    }

    async function fetchJoinedGames() {

        try {

            const response = await api.get("/joined-games");

            setJoinedGames(response.data.games);

        }

        catch (error) {

            console.log(error);

        }

    }

    function handleCreateGame(booking) {

        setSelectedBooking(booking);

    }

    return (

        <div className="min-h-screen bg-slate-950">

            <Navbar />

            <div className="max-w-7xl mx-auto px-8 py-12">

                {user && (

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-12">

                        <h1 className="text-4xl font-bold text-white">

                            👤 {user.name}

                        </h1>

                        <p className="text-gray-400 mt-3">

                            📧 {user.email}

                        </p>

                        <p className="text-gray-400 mt-2">

                            📍 {user.location || "Location not added"}

                        </p>

                    </div>

                )}

                <h2 className="text-3xl font-bold text-white mb-8">

                    📅 My Bookings

                </h2>

                {

                    bookings.length === 0 ?

                        (

                            <p className="text-gray-400">

                                You haven't booked any venues yet.

                            </p>

                        )

                        :

                        (

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

                                {

                                    bookings.map((booking) => (

                                        <BookingCard

                                            key={booking._id}

                                            booking={booking}

                                            onCreateGame={handleCreateGame}

                                        />

                                    ))

                                }

                            </div>

                        )

                }

                <h2 className="text-3xl font-bold text-white mt-16 mb-8">

                    🎮 My Games

                </h2>

                {

                    myGames.length === 0 ?

                        (

                            <p className="text-gray-400">

                                You haven't created any games yet.

                            </p>

                        )

                        :

                        (

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

                                {

                                    myGames.map((game) => (

                                        <GameCardProfile

                                            key={game._id}

                                            game={game}

                                        />

                                    ))

                                }

                            </div>

                        )

                }

                <h2 className="text-3xl font-bold text-white mt-16 mb-8">

                    🤝 Joined Games

                </h2>

                {

                    joinedGames.length === 0 ?

                        (

                            <p className="text-gray-400">

                                You haven't joined any games yet.

                            </p>

                        )

                        :

                        (

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

                                {

                                    joinedGames.map((game) => (

                                        <GameCardProfile

                                            key={game._id}

                                            game={game}

                                        />

                                    ))

                                }

                            </div>

                        )

                }

            </div>

            {

                selectedBooking && (

                    <CreateGameModal

                        booking={selectedBooking}

                        onClose={() => setSelectedBooking(null)}

                        onSuccess={() => {

                            setSelectedBooking(null);

                            fetchBookings();

                            fetchMyGames();

                        }}

                    />

                )

            }

        </div>

    );

}

export default Profile;