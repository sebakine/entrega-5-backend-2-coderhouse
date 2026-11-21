import { Router } from 'express';
import eventsRouter from './events.router.js';
import sessionsRouter from './sessions.router.js';
import usersRouter from './users.router.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'success', payload: { uptime: process.uptime() } }));
router.use('/sessions', sessionsRouter);
router.use('/events', eventsRouter);
router.use('/users', usersRouter);

export default router;
