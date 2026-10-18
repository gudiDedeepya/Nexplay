import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-500">NEXPLAY</h1>

        <div className="hidden md:flex gap-10 items-center text-white">
          <Link to="/home" className="hover:text-blue-500">Home</Link>
          <Link to="/venues" className="hover:text-blue-500">Venues</Link>
          <Link to="/games" className="hover:text-blue-500">Games</Link>
          <Link to="/profile" className="hover:text-blue-500">Profile</Link>
          <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg">
            Logout
          </button>
        </div>

        <button className="md:hidden text-white text-3xl" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col items-center gap-6 py-6 bg-slate-900 text-white">
          <Link to="/home" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/venues" onClick={() => setMenuOpen(false)}>Venues</Link>
          <Link to="/games" onClick={() => setMenuOpen(false)}>Games</Link>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
