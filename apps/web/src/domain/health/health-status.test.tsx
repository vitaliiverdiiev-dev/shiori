import { StrictMode } from 'react';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { HealthStatus } from './health-status';

type Reply = () => Response;

const ok: Reply = () => HttpResponse.json({ status: 'ok' });
const ready: Reply = () =>
  HttpResponse.json({ checks: { database: 'up' }, status: 'ok' });
const notReady: Reply = () =>
  HttpResponse.json(
    { checks: { database: 'down' }, status: 'error' },
    { status: 503 },
  );
const unreachable: Reply = () => HttpResponse.error();

function mockApi(health: Reply, readiness?: Reply) {
  const calls = { health: 0, readiness: 0 };
  server.use(
    http.get('*/api/health', () => {
      calls.health += 1;
      return health();
    }),
    http.get('*/api/ready', () => {
      calls.readiness += 1;
      return readiness ? readiness() : HttpResponse.error();
    }),
  );
  return calls;
}

function sequence(...replies: Reply[]): Reply {
  let index = 0;
  return () => {
    const reply = replies[Math.min(index, replies.length - 1)] ?? unreachable;
    index += 1;
    return reply();
  };
}

describe('HealthStatus', () => {
  it('shows API and database online', async () => {
    mockApi(ok, ready);
    renderWithProviders(<HealthStatus />);

    expect(screen.getByText('Checking API…')).toBeInTheDocument();
    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(screen.getByText('API online')).toBeInTheDocument();
  });

  it('keeps the API online when only readiness fails', async () => {
    mockApi(ok, notReady);
    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByText('API online')).toBeInTheDocument();
  });

  it('does not treat a malformed readiness success as database online', async () => {
    mockApi(ok, () => HttpResponse.json({ status: 'ok' }));
    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
  });

  it('reports an unreachable API, an unknown database and skips readiness', async () => {
    const calls = mockApi(unreachable, ready);
    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByText('API is unreachable')).toBeInTheDocument();
    expect(screen.getByText('Database unknown')).toBeInTheDocument();
    expect(calls.readiness).toBe(0);
  });

  it('reports the status code of a failing health endpoint', async () => {
    mockApi(() => HttpResponse.json({}, { status: 502 }));
    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('API responded 502')).toBeInTheDocument();
  });

  it('makes one health and one readiness request under StrictMode', async () => {
    const calls = mockApi(ok, ready);
    renderWithProviders(
      <StrictMode>
        <HealthStatus />
      </StrictMode>,
    );

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(calls).toEqual({ health: 1, readiness: 1 });
  });

  it('recovers when the user checks again after the API was down', async () => {
    const calls = mockApi(sequence(unreachable, ok), ready);
    const { user } = renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('Database unknown')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(screen.getByText('API online')).toBeInTheDocument();
    expect(screen.queryByText('API is unreachable')).not.toBeInTheDocument();
    expect(calls).toEqual({ health: 2, readiness: 1 });
  });

  it('re-checks both endpoints when the database was down', async () => {
    const calls = mockApi(ok, sequence(notReady, ready));
    const { user } = renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(calls).toEqual({ health: 2, readiness: 2 });
  });
});
