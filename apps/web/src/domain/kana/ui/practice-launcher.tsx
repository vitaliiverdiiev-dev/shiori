import { type ReactNode, useId, useState } from 'react';
import type { KanaId, KanaScript } from '@shiori/kana';
import { Link, useNavigate } from 'react-router';
import { Button, buttonVariants, Input } from '@/shared/ui';
import {
  describeQuestionCount,
  parseQuestionCount,
} from '../helpers/question-count';
import { createSession, getPracticePhase } from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
import { kanaPaths, MAX_QUESTION_COUNT } from '../model/consts';

type Props = {
  script: KanaScript;
  selectedIds: readonly KanaId[];
  selectionActions?: ReactNode;
  selectionStatus?: ReactNode;
  userId: string | undefined;
};

export const PracticeLauncher = ({
  script,
  selectedIds,
  selectionActions,
  selectionStatus,
  userId,
}: Props) => {
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
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        {selectionStatus}
        {selectionActions}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="text-sm font-medium" htmlFor={inputId}>
          Questions
        </label>
        <Input
          aria-describedby={descriptionId}
          aria-invalid={invalid || undefined}
          className="w-16 tabular-nums sm:w-20"
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
        <p
          className={invalid ? 'w-full text-sm text-destructive' : 'sr-only'}
          id={descriptionId}
        >
          {invalid
            ? `Enter a whole number from 1 to ${MAX_QUESTION_COUNT.toLocaleString('en')}.`
            : questionCount !== null &&
              !nothingSelected &&
              describeQuestionCount(questionCount, selectedIds.length)}
        </p>
      </div>
    </div>
  );
};
