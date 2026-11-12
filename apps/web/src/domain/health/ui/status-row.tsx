import { dotColors } from '../model/consts';
import type { StatusState } from '../model/types';

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
