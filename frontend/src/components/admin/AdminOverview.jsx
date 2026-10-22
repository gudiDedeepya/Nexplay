function AdminOverview({ metrics }) {
  return (
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
            {metrics.popularSports.map(({ sport, bookings }) => (
              <li key={sport} className="rounded-xl bg-slate-800 px-4 py-3 text-sm">
                <span className="font-semibold">{sport}</span>
                <span className="ml-2 text-slate-400">{bookings} bookings</span>
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
  );
}

export default AdminOverview;
