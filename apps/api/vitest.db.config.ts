import { defineConfig } from 'vitest/config';

// Real-database tests; run with `pnpm test:db` against the local *_test database.
export default defineConfig({
  test: {
    // Files share one database: run them one after another.
    fileParallelism: false,
    globalSetup: ['test/support/reset-test-database.ts'],
    include: ['test/**/*.db-spec.ts'],
  },
});
