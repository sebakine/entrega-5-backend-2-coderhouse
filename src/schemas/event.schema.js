import { z } from 'zod';
import { EVENT_STATUS } from '../models/event.model.js';
import { objectId, paginationQuery } from './common.schema.js';

const futureDate = z.coerce
  .date({ error: 'Fecha inválida' })
  .refine((date) => date.getTime() > Date.now(), 'La fecha del evento debe ser futura');

// El organizador y el estado "cancelled" nunca se aceptan desde el body:
// el dueño sale de la sesión y la cancelación tiene su propio endpoint.
const editableStatus = z.enum([EVENT_STATUS.DRAFT, EVENT_STATUS.PUBLISHED]);

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().min(2).max(200),
  startsAt: futureDate,
  capacity: z.coerce.number().int().min(1).max(100_000),
  status: editableStatus.default(EVENT_STATUS.PUBLISHED),
});

export const updateEventSchema = createEventSchema
  .partial()
  .extend({ status: editableStatus.optional() })
  .refine((data) => Object.keys(data).length > 0, 'Debés enviar al menos un campo para actualizar');

export const eventIdParams = z.object({ eid: objectId });

export const listEventsQuery = paginationQuery;
