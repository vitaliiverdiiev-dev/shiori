import type { ComponentProps } from 'react';
import product from '@/product-config';
import { Logo } from '@/shared/ui';

type Props = Omit<ComponentProps<typeof Logo>, 'glyph' | 'name'>;

export const AppLogo = (props: Props) => (
  <Logo glyph={product.logoGlyph} name={product.name} {...props} />
);
