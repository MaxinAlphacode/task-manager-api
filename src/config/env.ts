import 'dotenv/config';
import { z } from 'zod';

// Revisamos que las variables de entorno existan y tengan el formato correcto
// ANTES de arrancar. Si falta algo, la app se detiene con un mensaje claro.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
