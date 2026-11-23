import { cva } from 'class-variance-authority';

export const kanaSectionVariants = cva('flex min-w-0 flex-col gap-3', {
  variants: {
    section: {
      basic: '@2xl:row-span-2 @4xl:row-span-1',
      dakuten: '',
      yoon: '',
    },
  },
});
