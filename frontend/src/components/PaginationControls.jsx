function PaginationControls({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={!pagination.hasPreviousPage}
        onClick={() => onPageChange(pagination.page - 1)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span aria-live="polite" className="text-sm text-slate-400">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(pagination.page + 1)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}

export default PaginationControls;
