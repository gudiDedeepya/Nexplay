import PaginationControls from "../PaginationControls";
import { formatBookingDate } from "../../utils/bookingDates";

function AdminGamesSection({ games, pagination, onPageChange, onRemoveGame }) {
  return (
    <>
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
                <td className="p-4">
                  {game.title}
                  <p className="text-xs text-slate-400">{formatBookingDate(game.createdAt)}</p>
                </td>
                <td className="p-4">{game.organizerId?.name || "Account unavailable"}</td>
                <td className="p-4">
                  {game.bookingId?.venueId?.name || "Venue unavailable"}
                  <p className="text-xs text-slate-400">{game.sport}</p>
                </td>
                <td className="p-4">{game.joinedPlayers?.length || 0} / {game.maxPlayers}</td>
                <td className="p-4">{game.status}</td>
                <td className="p-4">
                  <button type="button" onClick={() => onRemoveGame(game)} className="text-red-300 hover:text-red-200">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!games.length && (
              <tr><td className="p-5 text-slate-400" colSpan="6">No community games found.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </>
  );
}

export default AdminGamesSection;
