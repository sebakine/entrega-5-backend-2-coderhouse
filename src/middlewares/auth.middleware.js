import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { toUserDTO } from '../dto/user.dto.js';
import { userService } from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Middleware de AUTENTICACIÓN — responde a "¿quién sos?".
// 1. Lee el JWT desde la cookie httpOnly.
// 2. Verifica firma y expiración.
// 3. Carga el usuario desde la base: si fue eliminado o le cambiaron el rol,
//    el cambio aplica en el siguiente request sin esperar a que el token expire.
// 4. Puebla req.user con un DTO sin datos sensibles.
// Cualquier falla responde 401 (nunca 403 ni 500).
export const authenticate = async (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) throw AppError.unauthorized('No autenticado');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('La sesión expiró, volvé a iniciar sesión');
    }
    throw AppError.unauthorized('Sesión inválida');
  }

  const user = await userService.findById(payload.sub);
  if (!user) throw AppError.unauthorized('Sesión inválida');

  req.user = toUserDTO(user);
  next();
};
