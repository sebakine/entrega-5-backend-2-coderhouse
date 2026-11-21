import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

// El token solo transporta el id (sub) y el rol: nunca datos sensibles.
export const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user._id ?? user.id),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });

// Fijar el algoritmo evita ataques de confusión de algoritmo (p. ej. "none").
export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
