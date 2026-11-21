import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/helpers/cn';
import { logoMarkVariants } from './logo-variants';

type Props = VariantProps<typeof logoMarkVariants> & {
  className?: string | undefined;
  glyph: string;
  label?: string | undefined;
};

export const LogoMark = ({ className, glyph, label, size }: Props) => (
  <span
    aria-hidden={label === undefined ? true : undefined}
    aria-label={label}
    className={cn(logoMarkVariants({ size }), className)}
    role={label === undefined ? undefined : 'img'}
  >
    {glyph}
  </span>
);
