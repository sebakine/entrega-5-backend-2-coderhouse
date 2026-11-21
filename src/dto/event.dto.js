export const toEventDTO = (event) => ({
  id: String(event._id),
  title: event.title,
  description: event.description,
  location: event.location,
  startsAt: event.startsAt,
  capacity: event.capacity,
  status: event.status,
  organizer: String(event.organizer?._id ?? event.organizer),
  cancelledAt: event.cancelledAt ?? null,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});
