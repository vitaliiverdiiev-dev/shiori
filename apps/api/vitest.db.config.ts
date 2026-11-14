import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Files share one database: run them one after another.
    fileParallelism: false,
    globalSetup: ['test/support/reset-test-database.ts'],
    include: ['test/**/*.db-spec.ts'],
  },
});
