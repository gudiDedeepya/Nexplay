import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-black text-blue-500"><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#b6c91a]" />NEXPLAY</h1>

        <div className="hidden md:flex gap-10 items-center uppercase text-white font-bold tracking-[.08em]">
          <NavLink to="/home" className={({ isActive }) => isActive ? "text-blue-400" : "hover:text-blue-500"}>Home</NavLink>
          <NavLink to="/venues" className={({ isActive }) => isActive ? "text-blue-400" : "hover:text-blue-500"}>Venues</NavLink>
          <NavLink to="/games" className={({ isActive }) => isActive ? "text-blue-400" : "hover:text-blue-500"}>Games</NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? "text-blue-400" : "hover:text-blue-500"}>Profile</NavLink>
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => isActive ? "text-blue-400" : "hover:text-blue-500"}>Admin</NavLink>}
          <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-black uppercase">
            Logout
          </button>
        </div>

        <button className="md:hidden text-white text-3xl" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col items-center gap-6 py-6 bg-slate-900 text-white">
          <NavLink to="/home" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/venues" onClick={() => setMenuOpen(false)}>Venues</NavLink>
          <NavLink to="/games" onClick={() => setMenuOpen(false)}>Games</NavLink>
          <NavLink to="/profile" onClick={() => setMenuOpen(false)}>Profile</NavLink>
          {isAdmin && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>}
          <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
