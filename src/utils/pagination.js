export const toPaginatedResponse = ({ docs, total, page, limit }, mapper) => ({
  status: 'success',
  payload: docs.map(mapper),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
});
