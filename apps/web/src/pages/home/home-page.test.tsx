import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './home-page';

const identity = {
  logoGlyph: '栞',
  name: 'Example',
  nameJa: '例',
  tagline: 'An example tagline',
};

describe('HomePage', () => {
  it('shows the product identity it is given and the server status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    render(<HomePage {...identity} />);

    expect(
      screen.getByRole('heading', { name: identity.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(identity.nameJa)).toHaveAttribute('lang', 'ja');
    expect(screen.getByText(identity.tagline)).toBeInTheDocument();
    expect(screen.getByText(identity.logoGlyph)).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'Server status' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('API offline')).toBeInTheDocument();
  });
});
