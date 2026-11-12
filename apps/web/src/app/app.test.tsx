import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import product from '@/product-config';
import { App } from './app';

describe('App', () => {
  it('renders the home page with identity from product.config.json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    render(<App />);

    expect(
      screen.getByRole('heading', { name: product.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(product.nameJa)).toBeInTheDocument();
    expect(screen.getByText(product.tagline)).toBeInTheDocument();
    expect(document.title).toBe(`${product.name} — ${product.tagline}`);
    expect(await screen.findByText('API offline')).toBeInTheDocument();
  });
});
