import { ROLES } from './roles.js';

const { USER, ORGANIZER, ADMIN } = ROLES;

// Matriz de permisos: única fuente de verdad sobre qué rol puede hacer qué.
// Las rutas nunca nombran roles sueltos; usan estas acciones con el middleware `authorize`.
//
// | Acción                               | user | organizer | admin |
// |--------------------------------------|------|-----------|-------|
// | Consultar eventos publicados         |  ✅  |    ✅     |  ✅   |
// | Crear eventos                        |  ❌  |    ✅     |  ✅   |
// | Modificar/cancelar eventos propios   |  ❌  |    ✅     |  ✅   |
// | Modificar cualquier evento           |  ❌  |    ❌     |  ✅   |
// | Ver todos los usuarios               |  ❌  |    ❌     |  ✅   |
// | Cambiar el rol de un usuario         |  ❌  |    ❌     |  ✅   |
export const PERMISSIONS = Object.freeze({
  EVENTS_READ_PUBLISHED: Object.freeze([USER, ORGANIZER, ADMIN]),
  EVENTS_CREATE: Object.freeze([ORGANIZER, ADMIN]),
  EVENTS_MANAGE_OWN: Object.freeze([ORGANIZER, ADMIN]),
  EVENTS_MANAGE_ANY: Object.freeze([ADMIN]),
  USERS_READ_ALL: Object.freeze([ADMIN]),
  USERS_MANAGE_ROLES: Object.freeze([ADMIN]),
});

export const can = (role, allowedRoles) => allowedRoles.includes(role);
