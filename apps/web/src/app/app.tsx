import { HomePage } from '@/pages/home';
import product from '@/product-config';

export const App = () => {
  const faviconHref = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="serif">${product.logoGlyph}</text></svg>`,
  )}`;

  return (
    <>
      <title>{`${product.name} — ${product.tagline}`}</title>
      <link href={faviconHref} rel="icon" />
      <HomePage
        logoGlyph={product.logoGlyph}
        name={product.name}
        nameJa={product.nameJa}
        tagline={product.tagline}
      />
    </>
  );
};
