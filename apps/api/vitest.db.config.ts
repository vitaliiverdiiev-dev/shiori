import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['test/support/reset-test-database.ts'],
    include: ['src/**/*.db-spec.ts', 'test/**/*.db-spec.ts'],
  },
});
