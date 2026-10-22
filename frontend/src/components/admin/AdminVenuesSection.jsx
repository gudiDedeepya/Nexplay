import PaginationControls from "../PaginationControls";

function AdminVenuesSection({
  venues,
  pagination,
  onPageChange,
  emptyVenue,
  setForm,
  setEditingVenueId,
  setVenueFormOpen,
  startEditing,
  setVenueToRemove
}) {
  function openCreateForm() {
    setForm(emptyVenue);
    setEditingVenueId(null);
    setVenueFormOpen(true);
  }

  return (
    <section className="mt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Venue listings</h2>
          <p className="mt-1 text-sm text-slate-400">
            Update venue details or remove a venue from public listings.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Add venue
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {venues.map((venue) => (
          <article
            key={venue._id}
            className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10 transition hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-white">{venue.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      venue.active === false
                        ? "bg-slate-800 text-slate-400"
                        : "bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {venue.active === false ? "Inactive" : "Active"}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-slate-400">{venue.location}</p>
              </div>
              <span className="shrink-0 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300">
                {venue.sport}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Price / hour</p>
                <p className="mt-1 font-semibold text-slate-100">{venue.pricePerHour}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Hours</p>
                <p className="mt-1 font-semibold text-slate-100">
                  {venue.operatingHours?.open || "16:00"}–{venue.operatingHours?.close || "21:00"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <button
                type="button"
                onClick={() => startEditing(venue)}
                className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-400/60 hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Edit venue
              </button>
              {venue.active !== false && (
                <button
                  type="button"
                  onClick={() => setVenueToRemove(venue)}
                  className="flex-1 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          </article>
        ))}
        {!venues.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">No venues yet</h3>
            <p className="mt-2 text-sm text-slate-400">Add your first venue to make it available to players.</p>
            <button
              type="button"
              onClick={() => setVenueFormOpen(true)}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
            >
              Add your first venue
            </button>
          </div>
        )}
      </div>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </section>
  );
}

export default AdminVenuesSection;
