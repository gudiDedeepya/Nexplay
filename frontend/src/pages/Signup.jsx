import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    try {
      await api.post("/signup", { name, email, password, location });
      const { data } = await api.post("/signin", { email, password });
      login(data.token);
      navigate("/home", { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-3 text-xl font-extrabold tracking-tight text-white">
          <span className="h-3 w-3 rounded-full bg-[#b6c91a]" />
          NEXPLAY
        </Link>

        <div className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_480px]">
          <section className="hidden lg:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b6c91a]">Join the community</p>
            <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[1.08]">Find your team. Book your court.</h1>
            <p className="mt-5 max-w-md leading-7 text-slate-400">Create a profile once and keep venues, bookings, and community games in one place.</p>
          </section>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-[#292b25] bg-[#151713] p-6 shadow-2xl shadow-black/30 sm:p-8">
            <h2 className="text-3xl font-bold">Create an account</h2>
            <p className="mt-2 text-sm text-slate-400">It only takes a minute.</p>

        <form onSubmit={handleSignup} className="mt-7 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <label className="block text-sm text-slate-300">Name
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 text-white outline-none transition focus:border-[#b6c91a]"
          />
          </label>

          <label className="block text-sm text-slate-300">Email address
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 text-white outline-none transition focus:border-[#b6c91a]"
          />
          </label>

          <label className="block text-sm text-slate-300">Password
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 pr-16 text-white outline-none transition focus:border-[#b6c91a]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#c8d64a] hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          </label>
          <p className="-mt-3 text-xs text-slate-400">
            Use at least 12 characters.
          </p>

          <label className="block text-sm text-slate-300">Location
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#34362f] bg-[#1d1f19] px-4 py-3 text-white outline-none transition focus:border-[#b6c91a]"
          />
          </label>

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#b6c91a] px-4 py-3 font-bold text-[#090909] transition hover:bg-[#c6d827] disabled:opacity-50">
            {loading ? "Creating account..." : "Signup"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?
          <Link to="/" className="text-blue-500 ml-2 hover:underline">Login</Link>
        </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Signup;
