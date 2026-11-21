import { cn } from '@/shared/helpers/cn';

type LogoSize = 'lg' | 'md' | 'sm' | 'xl';

type Props = {
  className?: string;
  decorative?: boolean;
  glyph: string;
  name: string;
  size?: LogoSize;
  variant?: 'lockup' | 'symbol';
};

const markSizes = {
  lg: 'size-16 rounded-2xl text-4xl',
  md: 'size-11 rounded-xl text-2xl',
  sm: 'size-8 rounded-lg text-lg',
  xl: 'size-28 rounded-3xl text-7xl sm:size-32 sm:text-8xl',
} as const satisfies Record<LogoSize, string>;

const lockupSizes = {
  lg: 'gap-4 text-2xl',
  md: 'gap-3 text-lg',
  sm: 'gap-2 text-base',
  xl: 'gap-5 text-4xl',
} as const satisfies Record<LogoSize, string>;

const markClass =
  'flex shrink-0 items-center justify-center bg-primary font-display leading-none text-primary-foreground select-none';

export const Logo = ({
  className,
  decorative = false,
  glyph,
  name,
  size = 'md',
  variant = 'lockup',
}: Props) => {
  if (variant === 'symbol') {
    return (
      <span
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : name}
        className={cn(markClass, markSizes[size], className)}
        role={decorative ? undefined : 'img'}
      >
        {glyph}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold tracking-tight',
        lockupSizes[size],
        className,
      )}
    >
      <span aria-hidden="true" className={cn(markClass, markSizes[size])}>
        {glyph}
      </span>
      {name}
    </span>
  );
};
