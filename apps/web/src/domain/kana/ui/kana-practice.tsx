import { useId, useRef, useState } from 'react';
import { ArrowLeftIcon, CheckIcon, XIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { Button, buttonVariants, Input } from '@/shared/ui';
import { findKana } from '../helpers/catalog';
import {
  createRetrySession,
  createSession,
  getPracticePhase,
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
  const { dispatch, session } = useKanaPractice(script, userId);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [emptyAnswer, setEmptyAnswer] = useState(false);
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
          if (phase === 'feedback') {
            dispatch({ type: 'next' });
            return;
          }
          const isEmpty = session.input.trim() === '';
          setEmptyAnswer(isEmpty);
          if (!isEmpty) dispatch({ type: 'submit' });
        }}
      >
        <label className="text-sm font-medium" htmlFor={inputId} id={labelId}>
          Reading in romaji
        </label>
        <Input
          aria-describedby={feedbackId}
          aria-invalid={attempt?.outcome === 'incorrect' ? true : undefined}
          aria-labelledby={`${promptId} ${labelId}`}
          aria-readonly={phase === 'feedback' ? true : undefined}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={focusInputOnMount}
          className="h-12 text-center text-lg pointer-coarse:h-12 md:text-lg"
          enterKeyHint={phase === 'feedback' ? 'next' : 'go'}
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
          value={phase === 'feedback' ? (attempt?.answer ?? '') : session.input}
        />

        <div className="min-h-12 text-sm" id={feedbackId} role="status">
          {emptyAnswer && (
            <p className="text-muted-foreground">
              Type the reading first, or choose Skip.
            </p>
          )}
          {attempt?.outcome === 'correct' && (
            <p className="flex items-center gap-2 font-medium text-primary">
              <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
              Correct: {kana?.romaji}
            </p>
          )}
          {attempt?.outcome === 'incorrect' && (
            <p className="flex flex-wrap items-center gap-x-2 text-destructive">
              <XIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>
                Incorrect. <span lang="ja">{kana?.form}</span> is{' '}
                <strong className="font-semibold">{kana?.romaji}</strong>; you
                answered “{attempt.answer}”.
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {phase === 'feedback' ? (
            <Button className="flex-1" size="lg" type="submit">
              Next
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
