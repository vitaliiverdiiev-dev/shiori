import { useId, useRef, useState } from 'react';
import { ArrowLeftIcon, CheckIcon, XIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { Button, buttonVariants, Input } from '@/shared/ui';
import { isAcceptedReading } from '../helpers/answer';
import { findKana } from '../helpers/catalog';
import {
  createRetrySession,
  createSession,
  getPracticePhase,
  isAwaitingCorrection,
} from '../helpers/session';
import { useKanaPractice } from '../hooks/use-kana-practice';
import { kanaScripts } from '../model/catalog';
import { kanaPaths } from '../model/consts';
import type { KanaScript } from '../model/types';
import { PracticeSummary } from './practice-summary';

type Props = {
  script: KanaScript;
  userId: string | undefined;
};

export const KanaPractice = ({ script, userId }: Props) => {
  const { awaitingAdvance, dispatch, session } = useKanaPractice(
    script,
    userId,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [emptyAnswer, setEmptyAnswer] = useState(false);
  const [lastWrong, setLastWrong] = useState<{
    answer: string;
    position: number;
  } | null>(null);
  const [focusInputOnMount, setFocusInputOnMount] = useState(
    () => window.matchMedia('(pointer: fine)').matches,
  );
  const promptId = useId();
  const labelId = useId();
  const feedbackId = useId();
  const inputId = useId();
  const paths = kanaPaths[script];

  if (!session) return <Navigate replace to={paths.selection} />;

  const phase = getPracticePhase(session);
  const leave = (
    <Link
      className={buttonVariants({
        className: '-ml-2.5 self-start',
        variant: 'ghost',
      })}
      to={paths.selection}
    >
      <ArrowLeftIcon aria-hidden="true" />
      Leave
    </Link>
  );

  if (phase === 'complete') {
    return (
      <div className="flex flex-col gap-6">
        {leave}
        <PracticeSummary
          onRestart={() => {
            setFocusInputOnMount(true);
            dispatch({
              session: createSession(session.selection),
              type: 'start',
            });
          }}
          onRetry={() => {
            setFocusInputOnMount(true);
            dispatch({ session: createRetrySession(session), type: 'start' });
          }}
          selectionPath={paths.selection}
          session={session}
        />
      </div>
    );
  }

  const kana = findKana(session.order[session.position] ?? '');
  const attempt =
    phase === 'feedback' ? session.attempts[session.position] : undefined;
  const correcting = isAwaitingCorrection(session);
  const wrongAnswer =
    lastWrong?.position === session.position
      ? lastWrong.answer
      : attempt?.answer;
  const keepTyping = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">{kanaScripts[script].label} practice</h1>
      <div className="flex items-center justify-between gap-3">
        {leave}
        <p className="text-sm text-muted-foreground tabular-nums">
          Question {session.position + 1} of {session.order.length}
        </p>
      </div>

      <p
        aria-live="polite"
        className="py-4 text-center text-7xl leading-none font-normal sm:py-8 sm:text-8xl"
        id={promptId}
        lang="ja"
      >
        {kana?.form}
      </p>

      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (composing.current) return;
          keepTyping();
          if (awaitingAdvance) return;
          const answer = session.input.trim();
          if (!correcting) setEmptyAnswer(answer === '');
          if (answer === '') return;
          dispatch({ type: 'submit' });
          if (kana && !isAcceptedReading(kana, answer)) {
            if (correcting) {
              setLastWrong({ answer, position: session.position });
            }
            inputRef.current?.select();
          }
        }}
      >
        <label className="text-sm font-medium" htmlFor={inputId} id={labelId}>
          Reading in romaji
        </label>
        <Input
          aria-describedby={feedbackId}
          aria-invalid={correcting ? true : undefined}
          aria-labelledby={`${promptId} ${labelId}`}
          aria-readonly={awaitingAdvance ? true : undefined}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={focusInputOnMount}
          className="h-12 text-center text-lg pointer-coarse:h-12 data-correct:border-success data-correct:ring-3 data-correct:ring-success/30 data-correct:focus-visible:border-success data-correct:focus-visible:ring-success/50 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/50 md:text-lg dark:aria-invalid:focus-visible:ring-destructive/50"
          data-correct={awaitingAdvance ? '' : undefined}
          enterKeyHint="go"
          id={inputId}
          onChange={(event) => {
            setEmptyAnswer(false);
            dispatch({ type: 'input', value: event.target.value });
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.repeat || event.nativeEvent.isComposing)
            ) {
              event.preventDefault();
            }
          }}
          ref={inputRef}
          spellCheck={false}
          value={session.input}
        />

        <div className="min-h-12 text-sm" id={feedbackId} role="status">
          {emptyAnswer && (
            <p className="text-muted-foreground">
              Type the reading first, or choose Skip.
            </p>
          )}
          {awaitingAdvance && (
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
              Correct: {kana?.romaji}
            </p>
          )}
          {correcting && (
            <p className="flex items-start gap-2 text-destructive">
              <XIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                Incorrect. <span lang="ja">{kana?.form}</span> is{' '}
                <strong className="font-semibold">{kana?.romaji}</strong>; you
                answered “{wrongAnswer}”. Type{' '}
                <strong className="font-semibold">{kana?.romaji}</strong> to
                continue.
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {phase === 'feedback' && attempt?.outcome === 'incorrect' ? (
            <Button className="flex-1" size="lg" type="submit">
              Check
            </Button>
          ) : (
            <>
              <Button
                className="flex-1"
                onClick={() => {
                  setEmptyAnswer(false);
                  dispatch({ type: 'skip' });
                  keepTyping();
                }}
                size="lg"
                type="button"
                variant="outline"
              >
                Skip
              </Button>
              <Button className="flex-1" size="lg" type="submit">
                Check
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
