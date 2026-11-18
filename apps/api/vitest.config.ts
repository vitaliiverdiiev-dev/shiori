import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export const sourceResolution = {
  ssr: {
    resolve: { conditions: ['shiori-source', ...defaultServerConditions] },
  },
};

export default defineConfig({
  ...sourceResolution,
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
  },
});
