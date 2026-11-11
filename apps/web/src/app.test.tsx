import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import product from '../../../product.config.json';
import { App } from './app.tsx';

describe('App', () => {
  it('shows product identity and an online API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ status: 'ok' }))),
    );
    render(<App />);

    expect(
      screen.getByRole('heading', { name: product.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(product.nameJa)).toBeInTheDocument();
    expect(screen.getByText(product.tagline)).toBeInTheDocument();
    expect(screen.getByText(product.logoGlyph)).toBeInTheDocument();
    expect(await screen.findByText('API online')).toBeInTheDocument();
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    render(<App />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByText('API is unreachable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  });

  it('reports an API that does not respond in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.reject(new DOMException('Timed out', 'TimeoutError')),
      ),
    );
    render(<App />);

    expect(
      await screen.findByText('API did not respond in time'),
    ).toBeInTheDocument();
  });

  it('makes a single health request under StrictMode', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ status: 'ok' })),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('recovers when the user checks again after a failure', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.queryByText('API is unreachable')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
