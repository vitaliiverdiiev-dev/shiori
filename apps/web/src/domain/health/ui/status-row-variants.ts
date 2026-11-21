import { cva } from 'class-variance-authority';
import type { StatusState } from '../model/types';

export const statusDotVariants = cva('mt-1.5 size-2.5 shrink-0 rounded-full', {
  variants: {
    state: {
      checking: 'animate-pulse bg-muted-foreground',
      offline: 'bg-destructive',
      online: 'bg-success',
      unavailable: 'bg-destructive',
      unknown: 'bg-muted-foreground/40',
    } satisfies Record<StatusState, string>,
  },
});
