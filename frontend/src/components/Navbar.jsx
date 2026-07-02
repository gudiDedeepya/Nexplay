import { Link } from "react-router-dom";

function Navbar() {

    return (

        <nav className="bg-slate-950 border-b border-slate-800">

            <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">

                <h1 className="text-4xl font-extrabold text-blue-500">

                    NEXPLAY

                </h1>

                <div className="hidden md:flex gap-10 text-white">

                    <Link to="/home" className="hover:text-blue-500">
                        Home
                    </Link>

                    <Link to="/venues" className="hover:text-blue-500">
                        Venues
                    </Link>

                    <Link to="/games" className="hover:text-blue-500">
                        Games
                    </Link>

                    <Link to="/profile" className="hover:text-blue-500">
                        Profile
                    </Link>

                </div>

                <button
                className="bg-blue-600 px-5 py-2 rounded-lg">

                    Logout

                </button>

            </div>

        </nav>

    );

}

export default Navbar;