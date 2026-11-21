export const ROLES = Object.freeze({
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

// Rol asignado en el registro público. Nunca se toma del body.
export const DEFAULT_ROLE = ROLES.USER;
