import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as users from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { listUsersQuery, updateRoleSchema, userIdParams } from '../schemas/user.schema.js';

// Rutas administrativas: todo el router exige sesión válida.
const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.USERS_READ_ALL), validate({ query: listUsersQuery }), users.list);

router.get('/:uid', authorize(PERMISSIONS.USERS_READ_ALL), validate({ params: userIdParams }), users.getById);

// Única vía para obtener el rol organizer/admin (el registro público siempre crea "user").
router.patch(
  '/:uid/role',
  authorize(PERMISSIONS.USERS_MANAGE_ROLES),
  validate({ params: userIdParams, body: updateRoleSchema }),
  users.updateRole,
);

export default router;
