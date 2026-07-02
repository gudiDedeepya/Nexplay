import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import SportsSection from "../components/SportsSection";
import FeaturesSection from "../components/FeaturesSection";

function Home(){

    const navigate = useNavigate();

    return(

        <div className="min-h-screen bg-slate-950 text-white">

            <Navbar/>

            <section className="max-w-7xl mx-auto px-8 py-20">

                <div className="grid lg:grid-cols-2 gap-20 items-center">

                    <div>

                        <p className="text-blue-400 font-semibold">

                            ⚡ Find Venues • Join Games • Train Better

                        </p>

                        <h1 className="text-6xl font-extrabold mt-6 leading-tight">

                            Play Together.

                            <br/>

                            <span className="text-blue-500">

                                Book Smarter.

                            </span>

                        </h1>

                        <p className="text-gray-400 mt-8 text-xl">

                            Discover nearby venues,

                            create or join games,

                            and connect with players

                            who love sports just like you.

                        </p>

                        <div className="flex gap-6 mt-10">

                            <button

                            onClick={()=>navigate("/venues")}

                            className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold">

                                Explore Venues

                            </button>

                            <button

                            onClick={()=>navigate("/games")}

                            className="border border-blue-500 px-8 py-4 rounded-xl">

                                View Games

                            </button>

                        </div>

                    </div>

                    <div>

                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl h-[450px] flex justify-center items-center text-8xl">

                            ⚽🏏🏀🎾

                        </div>

                    </div>

                </div>

            </section>
            <SportsSection />
            <FeaturesSection />

        </div>

    );

}

export default Home;