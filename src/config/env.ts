import 'dotenv/config';
import { z } from 'zod';

// Revisamos que las variables de entorno existan y tengan el formato correcto
// ANTES de arrancar. Si falta algo, la app se detiene con un mensaje claro.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  // La "llave" con la que firmamos los tokens. Corta = fácil de adivinar = insegura.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Usa un formato como 15m, 1h o 7d').default('1h'),

  // Cuánto detalle escriben los logs. Si no se indica: "silent" en tests, "info" en el resto.
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  // Cuántos proxies hay delante de la API (balanceador, Nginx...). 0 = conexión directa.
  // Sirve para saber la IP REAL del cliente, que es la que usa el rate limiting.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // Rate limiting: cuántas peticiones se permiten por IP en cada ventana de tiempo.
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300), // toda la API
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10), // intentos fallidos de login/registro
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  LOG_LEVEL: parsed.data.LOG_LEVEL ?? (parsed.data.NODE_ENV === 'test' ? 'silent' : 'info'),
};
