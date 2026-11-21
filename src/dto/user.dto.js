// DTO de salida: expone solo datos no sensibles (nunca password ni metadatos internos).
export const toUserDTO = (user) => ({
  id: String(user._id ?? user.id),
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  role: user.role,
});
