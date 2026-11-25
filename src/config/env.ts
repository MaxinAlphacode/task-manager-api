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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
