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
        throw new Error("Invalid credentials");
      }
      navigate(actualRole === "admin" ? "/admin" : "/home", { replace: true });
    } catch (error) {
      setError(error.response?.status === 401 ? "Invalid credentials" : error.message === "Invalid credentials" ? "Invalid credentials" : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-3 text-xl font-extrabold tracking-tight text-white">
          <span className="h-3 w-3 rounded-full bg-[#b6c91a]" />
          NEXPLAY
        </Link>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1fr_440px]">
          <section className="hidden lg:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b6c91a]">Welcome back</p>
            <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[1.08]">
              Your next game is already waiting.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-slate-400">
              Pick up where you left off, find a venue, and get back on the field.
            </p>
          </section>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-[#292b25] bg-[#151713] p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="mb-7">
              <h2 className="text-3xl font-bold">Sign in</h2>
              <p className="mt-2 text-sm text-slate-400">Choose your account type and continue.</p>
            </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-1" role="group" aria-label="Login role">
            {["player", "admin"].map((role) => (
              <button key={role} type="button" onClick={() => setLoginRole(role)} className={`rounded-md py-2 text-sm font-semibold capitalize ${loginRole === role ? "bg-blue-600 text-white" : "text-slate-400"}`}>
                {role}
              </button>
            ))}
          </div>
          {signupMessage && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{signupMessage}</p>}
          {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <label className="block text-sm text-slate-300">
            Email address
            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 text-white outline-none transition focus:border-[#b6c91a]"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Password
            <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 text-white outline-none transition focus:border-[#b6c91a]"
            />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#b6c91a] px-4 py-3 font-bold text-[#090909] transition hover:bg-[#c6d827] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?
          <Link to="/signup" className="text-blue-500 ml-2">Signup</Link>
        </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;
