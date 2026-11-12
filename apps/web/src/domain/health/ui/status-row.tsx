import type { StatusState } from '../model/types';

const dotColors = {
  checking: 'bg-muted-foreground animate-pulse',
  offline: 'bg-destructive',
  online: 'bg-success',
  unavailable: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
} as const satisfies Record<StatusState, string>;

type Props = {
  detail?: string | undefined;
  state: StatusState;
  text: string;
};

export const StatusRow = ({ detail, state, text }: Props) => (
  <div className="flex items-start gap-3">
    <span
      aria-hidden="true"
      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotColors[state]}`}
    />
    <div>
      <p className="font-medium">{text}</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  </div>
);
