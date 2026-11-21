import { ALL_ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

// Middleware de AUTORIZACIÓN — responde a "¿podés hacer esto?".
// Recibe los roles permitidos (idealmente una entrada de PERMISSIONS) y compara
// contra req.user.role. Siempre se monta DESPUÉS de `authenticate`.
//
//   router.post('/', authenticate, authorize(PERMISSIONS.EVENTS_CREATE), handler)
//
// - Sin req.user → 401 (defensa en profundidad si alguien olvida `authenticate`).
// - Con sesión pero rol no permitido → 403.
export const authorize = (...roles) => {
  const allowed = new Set(roles.flat());

  // Falla al arrancar (no en runtime) si la ruta está mal configurada.
  if (allowed.size === 0) throw new Error('authorize() requiere al menos un rol');
  const unknown = [...allowed].filter((role) => !ALL_ROLES.includes(role));
  if (unknown.length) throw new Error(`authorize(): roles desconocidos: ${unknown.join(', ')}`);

  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized('No autenticado'));
    if (!allowed.has(req.user.role)) return next(AppError.forbidden());
    return next();
  };
};
