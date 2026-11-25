// Variables de entorno de los tests, en UN solo lugar.
// Las usan tanto vitest.config.mts (para los tests) como global-setup.ts (para migrar).
export const testEnv = {
  NODE_ENV: 'test',
  // Base separada dentro del PostgreSQL de Docker (en CI se puede sobrescribir).
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgresql://taskmanager:taskmanager@localhost:5433/taskmanager_test',
  JWT_SECRET: 'secreto-solo-para-tests-0123456789abcdef',
  JWT_EXPIRES_IN: '1h',
};
