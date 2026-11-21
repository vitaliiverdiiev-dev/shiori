import type { StatusState } from '../model/types';
import { statusDotVariants } from './status-row-variants';

type Props = {
  detail?: string | undefined;
  state: StatusState;
  text: string;
};

export const StatusRow = ({ detail, state, text }: Props) => (
  <div className="flex items-start gap-3">
    <span aria-hidden="true" className={statusDotVariants({ state })} />
    <div>
      <p className="font-medium">{text}</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  </div>
);
