import { z } from 'zod';

// Las variables se cargan con `node --env-file-if-exists=.env` (ver scripts de package.json)
// y se validan al arrancar: si falta algo crítico, el proceso falla rápido y con un mensaje claro.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  MONGO_URL: z.string().min(1, 'MONGO_URL es obligatoria'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
  COOKIE_NAME: z.string().min(1).default('accessToken'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
export const isProduction = env.NODE_ENV === 'production';
