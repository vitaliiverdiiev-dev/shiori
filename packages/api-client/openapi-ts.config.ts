import { defineConfig } from '@hey-api/openapi-ts';

// The committed Nest contract is the only input: generation is offline and reproducible.
export default defineConfig({
  input: '../../apps/api/openapi.json',
  output: { importFileExtension: '.js', path: 'src/generated' },
  plugins: ['@hey-api/client-axios', '@tanstack/react-query'],
});
