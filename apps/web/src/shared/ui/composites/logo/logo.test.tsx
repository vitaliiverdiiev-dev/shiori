import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './logo';

describe('Logo', () => {
  it('names the lockup once, through its visible name', () => {
    render(
      <a href="/">
        <Logo glyph="栞" name="Shiori" />
      </a>,
    );

    expect(screen.getByRole('link', { name: 'Shiori' })).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('gives a standalone symbol an image name', () => {
    render(<Logo glyph="栞" name="Shiori" variant="symbol" />);

    expect(screen.getByRole('img', { name: 'Shiori' })).toHaveTextContent('栞');
  });

  it('hides a decorative symbol from assistive technology', () => {
    render(
      <>
        <Logo decorative glyph="栞" name="Shiori" variant="symbol" />
        <h1>Shiori</h1>
      </>,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('栞')).toHaveAttribute('aria-hidden', 'true');
  });

  it('scales with the size option', () => {
    const { rerender } = render(
      <Logo glyph="栞" name="Shiori" size="sm" variant="symbol" />,
    );
    expect(screen.getByRole('img')).toHaveClass('size-8');

    rerender(<Logo glyph="栞" name="Shiori" size="lg" variant="symbol" />);
    expect(screen.getByRole('img')).toHaveClass('size-16');
  });
});
