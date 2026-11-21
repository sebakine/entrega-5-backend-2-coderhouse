import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import * as sessions from '../controllers/sessions.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

const router = Router();

// Frena ataques de fuerza bruta sobre el login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiados intentos de inicio de sesión. Probá de nuevo más tarde.' },
});

router.post('/register', validate({ body: registerSchema }), sessions.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), sessions.login);
router.post('/logout', sessions.logout);
router.get('/current', authenticate, sessions.current);

export default router;
