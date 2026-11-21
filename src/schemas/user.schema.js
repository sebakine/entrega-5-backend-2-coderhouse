import { z } from 'zod';
import { ALL_ROLES } from '../constants/roles.js';
import { objectId, paginationQuery } from './common.schema.js';

export const userIdParams = z.object({ uid: objectId });

export const listUsersQuery = paginationQuery.extend({
  role: z.enum(ALL_ROLES).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(ALL_ROLES, { error: `Rol inválido. Valores permitidos: ${ALL_ROLES.join(', ')}` }),
});
