import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState("player");
  const signupMessage = location.state?.signupSuccess || "";

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    try {
      const response = await api.post("/signin", { email, password });
      login(response.data.token);
      const { data: me } = await api.get("/me");
      const actualRole = me.user?.role || "player";
      if (actualRole !== loginRole) {
        logout();
        throw new Error(loginRole === "admin" ? "Invalid credentials: this account is not an admin." : "Invalid credentials: this account is an admin. Select Admin.");
      }
      navigate(actualRole === "admin" ? "/admin" : "/home", { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-blue-500 text-center">NexPlay</h1>
        <p className="text-gray-400 text-center mt-2">Play. Book. Connect.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-1" role="group" aria-label="Login role">
            {["player", "admin"].map((role) => (
              <button key={role} type="button" onClick={() => setLoginRole(role)} className={`rounded-md py-2 text-sm font-semibold capitalize ${loginRole === role ? "bg-blue-600 text-white" : "text-slate-400"}`}>
                {role}
              </button>
            ))}
          </div>
          {signupMessage && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{signupMessage}</p>}
          {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none"
          />

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none"
          />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Don&apos;t have an account?
          <Link to="/signup" className="text-blue-500 ml-2">Signup</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
