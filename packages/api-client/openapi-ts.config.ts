import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../../apps/api/openapi.json',
  output: { importFileExtension: '.js', path: 'src/generated' },
  plugins: ['@hey-api/client-axios', '@tanstack/react-query'],
});
