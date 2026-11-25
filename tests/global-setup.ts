import { execSync } from 'node:child_process';

// Antes de correr los tests, nos aseguramos de que la base de datos de pruebas
// tenga las mismas tablas que el esquema. Cada test limpia sus propios datos.
export default function setup() {
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
