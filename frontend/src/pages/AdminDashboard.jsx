import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import AdminOverview from "../components/admin/AdminOverview";
import AdminVenuesSection from "../components/admin/AdminVenuesSection";
import AdminBookingsSection from "../components/admin/AdminBookingsSection";
import AdminGamesSection from "../components/admin/AdminGamesSection";

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

function fetchAdminDashboardData(venuePage, bookingPage, gamePage) {
  return Promise.all([
    api.get("/admin/dashboard"),
    api.get("/admin/venues", { params: { page: venuePage } }),
    api.get("/admin/bookings", { params: { page: bookingPage } }),
    api.get("/admin/games", { params: { page: gamePage } })
  ]);
}

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [metrics, setMetrics] = useState(null);
  const [venues, setVenues] = useState([]);
  const [venuesPagination, setVenuesPagination] = useState(null);
  const [venuePage, setVenuePage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [bookingsPagination, setBookingsPagination] = useState(null);
  const [bookingPage, setBookingPage] = useState(1);
  const [games, setGames] = useState([]);
  const [gamesPagination, setGamesPagination] = useState(null);
  const [gamePage, setGamePage] = useState(1);
  const [form, setForm] = useState(emptyVenue);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [venueFormOpen, setVenueFormOpen] = useState(false);
  const [venueToRemove, setVenueToRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingVenue, setRemovingVenue] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const updateDashboardData = useCallback(([dashboardResult, venuesResult, bookingsResult, gamesResult]) => {
    setMetrics(dashboardResult.data.metrics);
    setVenues(venuesResult.data.venues);
    setVenuesPagination(venuesResult.data.pagination);
    setBookings(bookingsResult.data.bookings);
    setBookingsPagination(bookingsResult.data.pagination);
    setGames(gamesResult.data.games);
    setGamesPagination(gamesResult.data.pagination);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      updateDashboardData(await fetchAdminDashboardData(venuePage, bookingPage, gamePage));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load the admin dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [bookingPage, gamePage, updateDashboardData, venuePage]);

  useEffect(() => {
    let active = true;

    async function loadInitialDashboard() {
      try {
        const results = await fetchAdminDashboardData(venuePage, bookingPage, gamePage);
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
  }, [bookingPage, gamePage, updateDashboardData, venuePage]);

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
    setVenueFormOpen(true);
    setNotice("");
  }

  function resetForm() {
    setForm(emptyVenue);
    setEditingVenueId(null);
    setVenueFormOpen(false);
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
    setRemovingVenue(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/venues/${venue._id}`);
      setNotice(`${venue.name} is no longer listed.`);
      if (editingVenueId === venue._id) resetForm();
      setVenueToRemove(null);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to remove this venue.");
    } finally {
      setRemovingVenue(false);
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
          <AdminOverview metrics={metrics} />
        )}

        {activeTab === "Venues" && (
          <AdminVenuesSection
            venues={venues}
            pagination={venuesPagination}
            onPageChange={setVenuePage}
            emptyVenue={emptyVenue}
            setForm={setForm}
            setEditingVenueId={setEditingVenueId}
            setVenueFormOpen={setVenueFormOpen}
            startEditing={startEditing}
            setVenueToRemove={setVenueToRemove}
          />
        )}

        {activeTab === "Bookings" && (
          <AdminBookingsSection
            bookings={bookings}
            pagination={bookingsPagination}
            onPageChange={setBookingPage}
          />
        )}

        {activeTab === "Games" && (
          <AdminGamesSection
            games={games}
            pagination={gamesPagination}
            onPageChange={setGamePage}
            onRemoveGame={removeGame}
          />
        )}

        {venueFormOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) resetForm();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="venue-form-title"
              className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur sm:p-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                    Venue management
                  </p>
                  <h2 id="venue-form-title" className="mt-2 text-2xl font-bold">
                    {editingVenueId ? "Edit venue" : "Add a venue"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {editingVenueId
                      ? "Update the details players see when booking."
                      : "Add venue details and booking hours for players."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close venue form"
                  className="rounded-lg p-2 text-xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveVenue} className="space-y-5 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["name", "Venue name", "text", "e.g. Riverside Sports Arena"],
                    ["location", "Location", "text", "City or neighborhood"],
                    ["pricePerHour", "Price per hour", "number", "e.g. 500"],
                    ["image", "Image URL (optional)", "url", "https://..."]
                  ].map(([name, label, type, placeholder]) => (
                    <label key={name} className="block text-sm font-medium text-slate-300">
                      {label}
                      <input
                        name={name}
                        type={type}
                        placeholder={placeholder}
                        min={type === "number" ? "0.01" : undefined}
                        step={type === "number" ? "0.01" : undefined}
                        value={form[name]}
                        onChange={updateForm}
                        required={name !== "image"}
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                  ))}

                  <label className="block text-sm font-medium text-slate-300">
                    Sport
                    <select
                      name="sport"
                      value={form.sport}
                      onChange={updateForm}
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
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
                      <label key={name} className="block text-sm font-medium text-slate-300">
                        {label}
                        <input
                          type="time"
                          name={name}
                          value={form.operatingHours[name]}
                          onChange={updateForm}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-medium text-slate-300">
                  Description <span className="font-normal text-slate-500">— optional</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    rows="3"
                    placeholder="Add useful details about the venue..."
                    className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                {error && (
                  <p role="alert" className="rounded-xl border border-red-800/80 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving venue..." : editingVenueId ? "Save changes" : "Create venue"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {venueToRemove && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !removingVenue) setVenueToRemove(null);
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-venue-title"
              aria-describedby="remove-venue-description"
              className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50 sm:p-7"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-xl text-red-300">
                !
              </div>
              <h2 id="remove-venue-title" className="mt-5 text-xl font-bold">
                Remove this venue?
              </h2>
              <p id="remove-venue-description" className="mt-2 text-sm leading-6 text-slate-400">
                <span className="font-semibold text-slate-200">{venueToRemove.name}</span> will no longer
                appear in public listings or accept new bookings. Existing booking history will be kept.
              </p>
              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-800/80 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setVenueToRemove(null)}
                  disabled={removingVenue}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Keep venue
                </button>
                <button
                  type="button"
                  onClick={() => deactivateVenue(venueToRemove)}
                  disabled={removingVenue}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingVenue ? "Removing..." : "Remove venue"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
