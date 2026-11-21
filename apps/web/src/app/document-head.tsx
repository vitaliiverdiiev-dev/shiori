import { useLocation } from 'react-router';
import product from '@/product-config';
import { getDocumentTitle } from './routing/route-metadata';

const faviconHref = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="serif">${product.logoGlyph}</text></svg>`,
)}`;

export const DocumentHead = () => {
  const { pathname } = useLocation();

  return (
    <>
      <title>{getDocumentTitle(pathname)}</title>
      <link href={faviconHref} rel="icon" />
    </>
  );
};
