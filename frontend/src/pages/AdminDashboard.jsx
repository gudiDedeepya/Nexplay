import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

const emptyVenue = {
  name: "",
  sport: "Football",
  location: "",
  pricePerHour: "",
  description: "",
  image: "",
  operatingHours: { open: "16:00", close: "21:00" }
};

const tabs = ["Overview", "Venues", "Bookings", "Games"];

function fetchAdminDashboardData() {
  return Promise.all([
    api.get("/admin/dashboard"),
    api.get("/admin/venues"),
    api.get("/admin/bookings"),
    api.get("/admin/games")
  ]);
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [metrics, setMetrics] = useState(null);
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyVenue);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const updateDashboardData = useCallback(([dashboardResult, venuesResult, bookingsResult, gamesResult]) => {
    setMetrics(dashboardResult.data.metrics);
    setVenues(venuesResult.data.venues);
    setBookings(bookingsResult.data.bookings);
    setGames(gamesResult.data.games);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      updateDashboardData(await fetchAdminDashboardData());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load the admin dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [updateDashboardData]);

  useEffect(() => {
    let active = true;

    async function loadInitialDashboard() {
      try {
        const results = await fetchAdminDashboardData();
        if (active) updateDashboardData(results);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load the admin dashboard. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialDashboard();
    return () => {
      active = false;
    };
  }, [updateDashboardData]);

  function updateForm(event) {
    const { name, value } = event.target;
    if (name === "open" || name === "close") {
      setForm((current) => ({
        ...current,
        operatingHours: { ...current.operatingHours, [name]: value }
      }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEditing(venue) {
    setEditingVenueId(venue._id);
    setForm({
      name: venue.name || "",
      sport: venue.sport || "Football",
      location: venue.location || "",
      pricePerHour: venue.pricePerHour ?? "",
      description: venue.description || "",
      image: venue.image || "",
      operatingHours: {
        open: venue.operatingHours?.open || "16:00",
        close: venue.operatingHours?.close || "21:00"
      }
    });
    setActiveTab("Venues");
    setNotice("");
  }

  function resetForm() {
    setForm(emptyVenue);
    setEditingVenueId(null);
  }

  async function saveVenue(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        pricePerHour: Number(form.pricePerHour),
        operatingHours: form.operatingHours
      };
      if (editingVenueId) {
        await api.put(`/admin/venues/${editingVenueId}`, payload);
        setNotice("Venue updated.");
      } else {
        await api.post("/admin/venues", payload);
        setNotice("Venue added.");
      }
      resetForm();
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save this venue.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateVenue(venue) {
    if (!window.confirm(`Remove ${venue.name} from public listings?`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/venues/${venue._id}`);
      setNotice(`${venue.name} is no longer listed.`);
      if (editingVenueId === venue._id) resetForm();
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to remove this venue.");
    }
  }

  async function removeGame(game) {
    if (!window.confirm(`Delete "${game.title}" and its chat history?`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/games/${game._id}`);
      setNotice("Game and its chat history deleted.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete this game.");
    }
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-12 text-slate-300" role="status">
          Loading admin dashboard...
        </main>
      </div>
    );
  }

  if (!isAdmin && error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold">Admin access required</h1>
          <p role="alert" className="mt-3 text-slate-300">{error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              NexPlay management
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Admin dashboard</h1>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </header>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mt-6 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-800 bg-red-950/40 text-red-200"
                : "border-emerald-800 bg-emerald-950/40 text-emerald-200"
            }`}
          >
            {error || notice}
          </div>
        )}

        <nav aria-label="Admin sections" className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                activeTab === tab
                  ? "border-blue-500 text-blue-300"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Overview" && (
          <section className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Active venues", metrics?.venueCount],
                ["All bookings", metrics?.totalBookings],
                ["Active bookings", metrics?.activeBookings],
                ["Cancelled bookings", metrics?.cancelledBookings],
                ["Community games", metrics?.gameCount]
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-bold">{value ?? "—"}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">Popular sports by active bookings</h2>
              {metrics?.popularSports?.length ? (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {metrics.popularSports.map(({ sport, bookings: count }) => (
                    <li key={sport} className="rounded-xl bg-slate-800 px-4 py-3 text-sm">
                      <span className="font-semibold">{sport}</span>
                      <span className="ml-2 text-slate-400">{count} bookings</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No active bookings yet.</p>
              )}
              <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">
                Revenue is not tracked because the platform does not process payments.
              </p>
            </div>
          </section>
        )}

        {activeTab === "Venues" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-4">Venue</th>
                    <th className="p-4">Sport</th>
                    <th className="p-4">Price/hour</th>
                    <th className="p-4">Listing</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue) => (
                    <tr key={venue._id} className="border-b border-slate-800/80 last:border-0">
                      <td className="p-4">
                        <p className="font-semibold">{venue.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{venue.location}</p>
                      </td>
                      <td className="p-4">{venue.sport}</td>
                      <td className="p-4">{venue.pricePerHour}</td>
                      <td className="p-4">{venue.active === false ? "Inactive" : "Active"}</td>
                      <td className="p-4">
                        <div className="flex gap-3">
                          <button type="button" onClick={() => startEditing(venue)} className="text-blue-300 hover:text-blue-200">
                            Edit
                          </button>
                          {venue.active !== false && (
                            <button type="button" onClick={() => deactivateVenue(venue)} className="text-red-300 hover:text-red-200">
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!venues.length && (
                    <tr><td className="p-5 text-slate-400" colSpan="5">No venues found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={saveVenue} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{editingVenueId ? "Edit venue" : "Add venue"}</h2>
                {editingVenueId && (
                  <button type="button" onClick={resetForm} className="text-sm text-slate-400 hover:text-white">
                    Cancel edit
                  </button>
                )}
              </div>
              {[
                ["name", "Venue name", "text"],
                ["location", "Location", "text"],
                ["pricePerHour", "Price per hour", "number"],
                ["image", "Image URL (optional)", "url"]
              ].map(([name, label, type]) => (
                <label key={name} className="block text-sm text-slate-300">
                  {label}
                  <input
                    name={name}
                    type={type}
                    min={type === "number" ? "0.01" : undefined}
                    step={type === "number" ? "0.01" : undefined}
                    value={form[name]}
                    onChange={updateForm}
                    required={name !== "image"}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
              ))}
              <label className="block text-sm text-slate-300">
                Sport
                <select name="sport" value={form.sport} onChange={updateForm} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  {["Football", "Cricket", "Badminton", "Basketball", "Kabaddi", "Tennis", "Volleyball"].map((sport) => (
                    <option key={sport}>{sport}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["open", "Opens at"],
                  ["close", "Closes at"]
                ].map(([name, label]) => (
                  <label key={name} className="block text-sm text-slate-300">
                    {label}
                    <input
                      type="time"
                      name={name}
                      value={form.operatingHours[name]}
                      onChange={updateForm}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                ))}
              </div>
              <label className="block text-sm text-slate-300">
                Description (optional)
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  rows="3"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingVenueId ? "Save changes" : "Create venue"}
              </button>
            </form>
          </section>
        )}

        {activeTab === "Bookings" && (
          <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-4">Player</th>
                  <th className="p-4">Venue</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Slot</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-slate-800/80 last:border-0">
                    <td className="p-4">{booking.userId?.name || "Account unavailable"}<p className="text-xs text-slate-400">{booking.userId?.email}</p></td>
                    <td className="p-4">{booking.venueId?.name || "Venue unavailable"}</td>
                    <td className="p-4">{formatDate(booking.bookingDate)}</td>
                    <td className="p-4">{booking.slot}</td>
                    <td className="p-4">{booking.status}</td>
                  </tr>
                ))}
                {!bookings.length && <tr><td className="p-5 text-slate-400" colSpan="5">No booking history yet.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "Games" && (
          <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-4">Game</th>
                  <th className="p-4">Organizer</th>
                  <th className="p-4">Venue / sport</th>
                  <th className="p-4">Players</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game._id} className="border-b border-slate-800/80 last:border-0">
                    <td className="p-4">{game.title}<p className="text-xs text-slate-400">{formatDate(game.createdAt)}</p></td>
                    <td className="p-4">{game.organizerId?.name || "Account unavailable"}</td>
                    <td className="p-4">{game.bookingId?.venueId?.name || "Venue unavailable"}<p className="text-xs text-slate-400">{game.sport}</p></td>
                    <td className="p-4">{game.joinedPlayers?.length || 0} / {game.maxPlayers}</td>
                    <td className="p-4">{game.status}</td>
                    <td className="p-4">
                      <button type="button" onClick={() => removeGame(game)} className="text-red-300 hover:text-red-200">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!games.length && <tr><td className="p-5 text-slate-400" colSpan="6">No community games found.</td></tr>}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
