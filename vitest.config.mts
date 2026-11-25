import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Los tests usan su PROPIA base de datos, para no ensuciar la de desarrollo.
    env: { NODE_ENV: 'test', DATABASE_URL: 'file:./test.db' },
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
  },
});
