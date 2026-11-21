import { env, isProduction } from '../config/env.js';

// httpOnly: el JS del navegador no puede leer el token (mitiga XSS).
// sameSite strict: el navegador no la envía en requests cross-site (mitiga CSRF).
// secure: en producción solo viaja por HTTPS.
const baseOptions = Object.freeze({
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction,
  path: '/',
});

export const setAuthCookie = (res, token) =>
  res.cookie(env.COOKIE_NAME, token, { ...baseOptions, maxAge: env.JWT_EXPIRES_IN * 1000 });

export const clearAuthCookie = (res) => res.clearCookie(env.COOKIE_NAME, baseOptions);
