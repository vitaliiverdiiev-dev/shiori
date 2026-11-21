import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/helpers/cn';
import { LogoMark } from './ui/logo-mark';
import { logoVariants } from './ui/logo-variants';

type Props = VariantProps<typeof logoVariants> & {
  className?: string;
  decorative?: boolean;
  glyph: string;
  name: string;
  variant?: 'lockup' | 'symbol';
};

export const Logo = ({
  className,
  decorative = false,
  glyph,
  name,
  size,
  variant = 'lockup',
}: Props) =>
  variant === 'symbol' ? (
    <LogoMark
      className={className}
      glyph={glyph}
      label={decorative ? undefined : name}
      size={size}
    />
  ) : (
    <span className={cn(logoVariants({ size }), className)}>
      <LogoMark glyph={glyph} size={size} />
      {name}
    </span>
  );
