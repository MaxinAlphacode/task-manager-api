import { defineConfig } from 'vitest/config';
import { testEnv } from './tests/test-env.mts';

export default defineConfig({
  test: {
    environment: 'node',
    // Los tests usan su PROPIA base de datos, para no ensuciar la de desarrollo.
    env: testEnv,
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
  },
});
