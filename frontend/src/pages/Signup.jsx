import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/signup", { name, email, password, location });
      navigate("/", { state: { signupSuccess: data.message } });
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-blue-500 text-center">NexPlay</h1>
        <p className="text-gray-400 text-center mt-2">Create your account</p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="-mt-3 text-xs text-slate-400">
            Use at least 12 characters.
          </p>

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-lg font-semibold text-white disabled:opacity-50">
            {loading ? "Creating account..." : "Signup"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?
          <Link to="/" className="text-blue-500 ml-2 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
