import { can, PERMISSIONS } from '../constants/permissions.js';
import { eventService } from '../services/event.service.js';
import { AppError } from '../utils/AppError.js';

// Middleware de PROPIEDAD de recursos — responde a "¿este recurso es tuyo?".
// Genérico: recibe cómo cargar el recurso, cómo obtener su dueño y qué roles
// pueden saltear el chequeo (p. ej. admin). Deja el recurso en req.resource
// para que el controlador no vuelva a consultarlo.
//
// Respuestas: 404 si el recurso no existe, 403 si existe pero no es tuyo.
export const requireOwnership =
  ({ load, getOwnerId, bypassRoles = [], message }) =>
  async (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized('No autenticado');

    const resource = await load(req);
    const isOwner = String(getOwnerId(resource)) === req.user.id;

    if (!isOwner && !can(req.user.role, bypassRoles)) {
      throw AppError.forbidden(message);
    }

    req.resource = resource;
    next();
  };

// organizer → solo sus eventos; admin (EVENTS_MANAGE_ANY) → cualquiera.
export const requireEventOwnership = requireOwnership({
  load: (req) => eventService.getById(req.params.eid),
  getOwnerId: (event) => event.organizer,
  bypassRoles: PERMISSIONS.EVENTS_MANAGE_ANY,
  message: 'Solo podés modificar eventos que organizás',
});
