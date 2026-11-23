import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonVariants, Input } from '@/shared/ui';
import {
  describeQuestionCount,
  parseQuestionCount,
} from '../helpers/question-count';
import { createSession, getPracticePhase } from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
import { kanaPaths, MAX_QUESTION_COUNT } from '../model/consts';
import type { KanaId, KanaScript } from '../model/types';

type Props = {
  script: KanaScript;
  selectedIds: readonly KanaId[];
  userId: string | undefined;
};

export const PracticeLauncher = ({ script, selectedIds, userId }: Props) => {
  const navigate = useNavigate();
  const inputId = useId();
  const descriptionId = useId();
  const [stored] = useState(() => readKanaState(script, userId));
  const unfinished =
    stored.session && getPracticePhase(stored.session) !== 'complete'
      ? stored.session
      : null;
  const [countText, setCountText] = useState<null | string>(
    stored.questionCount === null ? null : String(stored.questionCount),
  );
  const nothingSelected = selectedIds.length === 0;
  const questionCount =
    countText === null ? selectedIds.length : parseQuestionCount(countText);
  const invalid = !nothingSelected && questionCount === null;
  const startRound = () => {
    if (questionCount === null) return;
    writeKanaState(script, userId, {
      session: createSession(selectedIds, { questionCount }),
    });
    void navigate(kanaPaths[script].practice);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor={inputId}>
          Questions
        </label>
        <Input
          aria-describedby={descriptionId}
          aria-invalid={invalid || undefined}
          className="w-20 tabular-nums"
          disabled={nothingSelected}
          id={inputId}
          inputMode="numeric"
          max={MAX_QUESTION_COUNT}
          min={1}
          onChange={(event) => {
            const text = event.target.value;
            setCountText(text);
            const count = parseQuestionCount(text);
            if (count !== null) {
              writeKanaState(script, userId, { questionCount: count });
            }
          }}
          step={1}
          type="number"
          value={countText ?? String(selectedIds.length)}
        />
      </div>
      <p
        className={
          invalid ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
        }
        id={descriptionId}
      >
        {invalid
          ? `Enter a whole number from 1 to ${MAX_QUESTION_COUNT.toLocaleString('en')}.`
          : questionCount !== null &&
            !nothingSelected &&
            describeQuestionCount(questionCount, selectedIds.length)}
      </p>
      <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
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
          disabled={nothingSelected || invalid}
          focusableWhenDisabled
          onClick={startRound}
          variant={unfinished ? 'outline' : 'default'}
        >
          {unfinished ? 'Start new round' : 'Start practice'}
        </Button>
      </div>
    </div>
  );
};
