import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer();

export function registrationMode(mode: 'closed' | 'invite') {
  return http.get('*/api/registration', () => HttpResponse.json({ mode }));
}
