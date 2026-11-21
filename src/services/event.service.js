import { EVENT_STATUS, EventModel } from '../models/event.model.js';
import { AppError } from '../utils/AppError.js';

const paginate = async (filter, { page, limit }, sort) => {
  const [docs, total] = await Promise.all([
    EventModel.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EventModel.countDocuments(filter),
  ]);
  return { docs, total, page, limit };
};

const assertNotCancelled = (event) => {
  if (event.status === EVENT_STATUS.CANCELLED) {
    throw AppError.conflict('El evento está cancelado y ya no puede modificarse');
  }
};

export const eventService = {
  listPublished(pagination) {
    return paginate({ status: EVENT_STATUS.PUBLISHED }, pagination, { startsAt: 1 });
  },

  listByOrganizer(organizerId, pagination) {
    return paginate({ organizer: organizerId }, pagination, { createdAt: -1 });
  },

  async getPublishedById(id) {
    const event = await EventModel.findOne({ _id: id, status: EVENT_STATUS.PUBLISHED }).lean();
    if (!event) throw AppError.notFound('Evento no encontrado');
    return event;
  },

  async getById(id) {
    const event = await EventModel.findById(id).lean();
    if (!event) throw AppError.notFound('Evento no encontrado');
    return event;
  },

  create(data, organizerId) {
    return EventModel.create({ ...data, organizer: organizerId });
  },

  // Recibe el evento ya cargado por el middleware de propiedad (req.resource).
  async update(event, changes) {
    assertNotCancelled(event);
    return EventModel.findByIdAndUpdate(event._id, changes, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  },

  async cancel(event) {
    assertNotCancelled(event);
    return EventModel.findByIdAndUpdate(
      event._id,
      { status: EVENT_STATUS.CANCELLED, cancelledAt: new Date() },
      { returnDocument: 'after' },
    ).lean();
  },
};
