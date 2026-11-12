import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthStatus } from './health-status';

type Handler = () => Promise<Response>;

const ok: Handler = () => Promise.resolve(Response.json({ status: 'ok' }));
const ready: Handler = () =>
  Promise.resolve(Response.json({ checks: { database: 'up' }, status: 'ok' }));
const notReady: Handler = () =>
  Promise.resolve(
    Response.json(
      { checks: { database: 'down' }, status: 'error' },
      { status: 503 },
    ),
  );
const unreachable: Handler = () =>
  Promise.reject(new TypeError('Failed to fetch'));

/** Stubs fetch per API path; unknown paths fail loudly. */
function mockApi(routes: Record<string, Handler>) {
  // The app always calls fetch with a path string.
  const fetchMock = vi.fn((path: string) => {
    const handler = routes[path];
    return handler
      ? handler()
      : Promise.reject(new Error(`unexpected ${path}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('HealthStatus', () => {
  it('shows API and database online', async () => {
    mockApi({ '/api/health': ok, '/api/ready': ready });
    render(<HealthStatus />);

    expect(screen.getByText('Checking API…')).toBeInTheDocument();
    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.getByText('Database online')).toBeInTheDocument();
  });

  it('shows the database as unavailable when readiness fails', async () => {
    mockApi({ '/api/health': ok, '/api/ready': notReady });
    render(<HealthStatus />);

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('does not treat a malformed readiness success as database online', async () => {
    mockApi({
      '/api/health': ok,
      '/api/ready': () => Promise.resolve(Response.json({ status: 'ok' })),
    });
    render(<HealthStatus />);

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('shows the database as unknown when the API is unreachable', async () => {
    const fetchMock = mockApi({ '/api/health': unreachable });
    render(<HealthStatus />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByText('API is unreachable')).toBeInTheDocument();
    expect(screen.getByText('Database unknown')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // readiness not attempted
  });

  it('reports an API that does not respond in time', async () => {
    mockApi({
      '/api/health': () =>
        Promise.reject(new DOMException('Timed out', 'TimeoutError')),
    });
    render(<HealthStatus />);

    expect(
      await screen.findByText('API did not respond in time'),
    ).toBeInTheDocument();
  });

  it('makes one health and one readiness request under StrictMode', async () => {
    const fetchMock = mockApi({ '/api/health': ok, '/api/ready': ready });
    render(
      <StrictMode>
        <HealthStatus />
      </StrictMode>,
    );

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('recovers when the user checks again after the API was down', async () => {
    const health = vi
      .fn<Handler>()
      .mockImplementationOnce(unreachable)
      .mockImplementation(ok);
    mockApi({ '/api/health': health, '/api/ready': ready });
    render(<HealthStatus />);

    expect(await screen.findByText('Database unknown')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(screen.getByText('API online')).toBeInTheDocument();
    expect(screen.queryByText('API is unreachable')).not.toBeInTheDocument();
    expect(health).toHaveBeenCalledTimes(2);
  });

  it('recovers when the user checks again after the database was down', async () => {
    const readiness = vi
      .fn<Handler>()
      .mockImplementationOnce(notReady)
      .mockImplementation(ready);
    mockApi({ '/api/health': ok, '/api/ready': readiness });
    render(<HealthStatus />);

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('Database online')).toBeInTheDocument();
    expect(screen.getByText('API online')).toBeInTheDocument();
    expect(readiness).toHaveBeenCalledTimes(2);
  });
});
