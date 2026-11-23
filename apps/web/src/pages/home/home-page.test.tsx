import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home-page';

const identity = {
  logoGlyph: '栞',
  name: 'Example',
  nameJa: '例',
  tagline: 'An example tagline',
};

describe('HomePage', () => {
  it('shows the product identity it is given', () => {
    render(<HomePage {...identity} />);

    expect(screen.getByText(identity.name)).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText(identity.nameJa)).toHaveAttribute('lang', 'ja');
    expect(screen.getByText(identity.tagline)).toBeInTheDocument();
    expect(screen.getByText(identity.logoGlyph)).toBeInTheDocument();
  });
});
