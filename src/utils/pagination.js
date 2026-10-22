export function getPagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const parseValue = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };

  const page = parseValue(query.page, 1);
  const limit = parseValue(query.limit, defaultLimit);
  if (
    page === null ||
    page < 1 ||
    page > 100_000 ||
    limit === null ||
    limit < 1 ||
    limit > maxLimit
  ) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}

export function paginationDetails(page, limit, totalItems) {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}
