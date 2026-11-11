import { defineConfig } from 'vitest/config';

// Real-database tests; run with `pnpm test:db` against the local *_test database.
export default defineConfig({
  test: {
    include: ['test/**/*.db-spec.ts'],
  },
});
