import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as events from '../controllers/events.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { requireEventOwnership } from '../middlewares/ownership.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createEventSchema,
  eventIdParams,
  listEventsQuery,
  updateEventSchema,
} from '../schemas/event.schema.js';

const router = Router();

// Orden de la cadena en rutas protegidas:
//   authenticate (401) → authorize (403) → validate (400) → ownership (404/403) → controlador
// Así un usuario sin permisos nunca recibe feedback de validación sobre un recurso ajeno.

// --- Lectura pública: catálogo de eventos publicados ---
router.get('/', validate({ query: listEventsQuery }), events.listPublished);

// --- Gestión (organizer / admin) ---
router.get(
  '/mine',
  authenticate,
  authorize(PERMISSIONS.EVENTS_MANAGE_OWN),
  validate({ query: listEventsQuery }),
  events.listMine,
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.EVENTS_CREATE),
  validate({ body: createEventSchema }),
  events.create,
);

router.patch(
  '/:eid',
  authenticate,
  authorize(PERMISSIONS.EVENTS_MANAGE_OWN),
  validate({ params: eventIdParams, body: updateEventSchema }),
  requireEventOwnership,
  events.update,
);

router.patch(
  '/:eid/cancel',
  authenticate,
  authorize(PERMISSIONS.EVENTS_MANAGE_OWN),
  validate({ params: eventIdParams }),
  requireEventOwnership,
  events.cancel,
);

// Va al final para que "/mine" no sea capturado como :eid.
router.get('/:eid', validate({ params: eventIdParams }), events.getPublished);

export default router;
