import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonVariants } from '@/shared/ui';
import { createSession, getPracticePhase } from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
import { kanaPaths } from '../model/consts';
import type { KanaId, KanaScript } from '../model/types';

type Props = {
  script: KanaScript;
  selectedIds: readonly KanaId[];
  userId: string | undefined;
};

export const PracticeLauncher = ({ script, selectedIds, userId }: Props) => {
  const navigate = useNavigate();
  const [unfinished] = useState(() => {
    const { session } = readKanaState(script, userId);
    return session && getPracticePhase(session) !== 'complete' ? session : null;
  });
  const nothingSelected = selectedIds.length === 0;
  const startRound = () => {
    writeKanaState(script, userId, { session: createSession(selectedIds) });
    void navigate(kanaPaths[script].practice);
  };

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      {unfinished && (
        <Link
          className={buttonVariants({ className: 'flex-1 sm:flex-none' })}
          to={kanaPaths[script].practice}
        >
          Resume practice{' '}
          <span className="font-normal tabular-nums opacity-80">
            {unfinished.position + 1}/{unfinished.order.length}
          </span>
        </Link>
      )}
      <Button
        className="flex-1 sm:flex-none"
        disabled={nothingSelected}
        focusableWhenDisabled
        onClick={startRound}
        variant={unfinished ? 'outline' : 'default'}
      >
        {unfinished ? 'Start new round' : 'Start practice'}
      </Button>
    </div>
  );
};
