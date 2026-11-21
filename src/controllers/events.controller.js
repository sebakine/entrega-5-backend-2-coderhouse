import { toEventDTO } from '../dto/event.dto.js';
import { eventService } from '../services/event.service.js';
import { toPaginatedResponse } from '../utils/pagination.js';

export const listPublished = async (req, res) => {
  const result = await eventService.listPublished(req.validated.query);
  res.json(toPaginatedResponse(result, toEventDTO));
};

export const getPublished = async (req, res) => {
  const event = await eventService.getPublishedById(req.validated.params.eid);
  res.json({ status: 'success', payload: toEventDTO(event) });
};

export const listMine = async (req, res) => {
  const result = await eventService.listByOrganizer(req.user.id, req.validated.query);
  res.json(toPaginatedResponse(result, toEventDTO));
};

export const create = async (req, res) => {
  // El organizador sale de la sesión, nunca del body.
  const event = await eventService.create(req.validated.body, req.user.id);
  res.status(201).json({ status: 'success', payload: toEventDTO(event) });
};

// req.resource lo deja cargado el middleware de propiedad.
export const update = async (req, res) => {
  const event = await eventService.update(req.resource, req.validated.body);
  res.json({ status: 'success', payload: toEventDTO(event) });
};

export const cancel = async (req, res) => {
  const event = await eventService.cancel(req.resource);
  res.json({ status: 'success', payload: toEventDTO(event) });
};
