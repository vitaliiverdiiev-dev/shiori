import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { stubColorScheme } from './match-media';
import { server } from './msw';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  stubColorScheme(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  server.resetHandlers();
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
});

afterAll(() => {
  server.close();
});
