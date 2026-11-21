import { cva } from 'class-variance-authority';

export const logoVariants = cva(
  'inline-flex items-center font-semibold tracking-tight',
  {
    defaultVariants: { size: 'md' },
    variants: {
      size: {
        lg: 'gap-4 text-2xl',
        md: 'gap-3 text-lg',
        sm: 'gap-2 text-base',
        xl: 'gap-5 text-4xl',
      },
    },
  },
);

export const logoMarkVariants = cva(
  'flex shrink-0 items-center justify-center bg-primary font-display leading-none text-primary-foreground select-none',
  {
    defaultVariants: { size: 'md' },
    variants: {
      size: {
        lg: 'size-16 rounded-2xl text-4xl',
        md: 'size-11 rounded-xl text-2xl',
        sm: 'size-8 rounded-lg text-lg',
        xl: 'size-28 rounded-3xl text-7xl sm:size-32 sm:text-8xl',
      },
    },
  },
);
