import { cva } from 'class-variance-authority';

export const kanaRowVariants = cva('grid w-full min-w-0 flex-1', {
  variants: {
    section: {
      basic: 'grid-cols-5',
      dakuten: 'grid-cols-5',
      yoon: 'grid-cols-3',
    },
  },
});
