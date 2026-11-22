import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import product from '../../product.config.json' with { type: 'json' };
import { startupShell } from './src/app/startup/startup-shell.ts';
import { themeConfig } from './src/app/theme-config.ts';

const apiTarget = process.env.API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    startupShell(product, themeConfig),
  ],
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      '/api': {
        changeOrigin: true,
        target: apiTarget,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
