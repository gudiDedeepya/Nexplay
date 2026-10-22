import PaginationControls from "../PaginationControls";
import { formatBookingDate } from "../../utils/bookingDates";

function AdminBookingsSection({ bookings, pagination, onPageChange }) {
  return (
    <>
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
                <td className="p-4">
                  {booking.userId?.name || "Account unavailable"}
                  <p className="text-xs text-slate-400">{booking.userId?.email}</p>
                </td>
                <td className="p-4">{booking.venueId?.name || "Venue unavailable"}</td>
                <td className="p-4">{formatBookingDate(booking.bookingDate)}</td>
                <td className="p-4">{booking.slot}</td>
                <td className="p-4">{booking.status}</td>
              </tr>
            ))}
            {!bookings.length && (
              <tr><td className="p-5 text-slate-400" colSpan="5">No booking history yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </>
  );
}

export default AdminBookingsSection;
