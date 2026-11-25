import { execSync } from 'node:child_process';
import { testEnv } from './test-env.mts';

// Antes de correr los tests, aplicamos las migraciones REALES a la base de pruebas
// (las mismas que se aplican en producción). Cada test limpia sus propios datos.
// Ojo: este archivo corre en otro proceso y NO recibe `test.env` de Vitest,
// por eso le pasamos la URL de la base de pruebas a mano.
export default function setup() {
  try {
    execSync('npx prisma migrate deploy', { env: { ...process.env, ...testEnv }, stdio: 'pipe' });
  } catch (error) {
    const output = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `No se pudo preparar la base de datos de pruebas.\n` +
        `¿Está encendido PostgreSQL? Ejecuta: docker compose up -d db\n\n${output}`,
    );
  }
}
