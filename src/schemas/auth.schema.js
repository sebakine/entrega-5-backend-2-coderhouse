import { z } from 'zod';

// z.object descarta las claves desconocidas: si el cliente envía `role`,
// nunca llega al servicio. El rol del registro público es siempre "user".
export const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es obligatorio').max(60),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio').max(60),
  email: z.email('Email inválido').trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
});

export const loginSchema = z.object({
  email: z.email('Email inválido').trim().toLowerCase(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
