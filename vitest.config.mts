import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Los tests usan su PROPIA base de datos, para no ensuciar la de desarrollo.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'secreto-solo-para-tests-0123456789abcdef',
      JWT_EXPIRES_IN: '1h',
    },
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
  },
});
