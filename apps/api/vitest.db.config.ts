import { defineConfig } from 'vitest/config';
import { sourceResolution } from './vitest.config.js';

export default defineConfig({
  ...sourceResolution,
  test: {
    fileParallelism: false,
    globalSetup: ['test/support/reset-test-database.ts'],
    include: ['src/**/*.db-spec.ts', 'test/**/*.db-spec.ts'],
  },
});
