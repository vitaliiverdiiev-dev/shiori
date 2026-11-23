import { useId, useRef, useState } from 'react';
import {
  findKana,
  isAcceptedReading,
  type KanaScript,
  kanaScripts,
} from '@shiori/kana';
import { ArrowLeftIcon, CheckIcon, LightbulbIcon, XIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import {
  Button,
  buttonVariants,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui';
import {
  createRetrySession,
  createSession,
  getPracticePhase,
  isAwaitingCorrection,
} from '../helpers/session';
import { useAttemptSync } from '../hooks/use-attempt-sync';
import { useKanaPractice } from '../hooks/use-kana-practice';
import { kanaPaths, MAX_ANSWER_LENGTH } from '../model/consts';
import { PracticeSummary } from './practice-summary';

type Props = {
  script: KanaScript;
  userId: string | undefined;
};

export const KanaPractice = ({ script, userId }: Props) => {
  const attemptSync = useAttemptSync(userId);
  const { awaitingAdvance, dispatch, session } = useKanaPractice(
    script,
    userId,
    attemptSync.record,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [answerProblem, setAnswerProblem] = useState<
    'empty' | 'too-long' | null
  >(null);
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
          onDiscardRejected={attemptSync.discardRejected}
          onRestart={() => {
            setFocusInputOnMount(true);
            dispatch({
              session: createSession(session.selection, {
                mode: session.mode,
                questionCount: session.questionCount,
              }),
              type: 'start',
            });
          }}
          onRetry={() => {
            setFocusInputOnMount(true);
            dispatch({ session: createRetrySession(session), type: 'start' });
          }}
          onRetryRejected={attemptSync.retryRejected}
          onRetrySave={attemptSync.retry}
          saveStatus={attemptSync}
          selectionPath={paths.selection}
          session={session}
        />
      </div>
    );
  }

  const question = session.order[session.position];
  const kana =
    question?.direction === 'kana-to-romaji'
      ? findKana(question.kanaId)
      : undefined;
  const input = session.inputs[0] ?? '';
  const correcting = isAwaitingCorrection(session);
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
          const answer = input.trim();
          if (answer.length > MAX_ANSWER_LENGTH) {
            setAnswerProblem('too-long');
            return;
          }
          setAnswerProblem(!correcting && answer === '' ? 'empty' : null);
          if (answer === '') return;
          dispatch({ type: 'submit' });
          if (kana && !isAcceptedReading(kana, answer)) {
            inputRef.current?.select();
          }
        }}
      >
        <label className="text-sm font-medium" htmlFor={inputId} id={labelId}>
          Reading in romaji
        </label>
        <InputGroup
          className="h-12 pointer-coarse:h-12 data-correct:border-success data-correct:ring-3 data-correct:ring-success/30 data-correct:has-[[data-slot=input-group-control]:focus-visible]:border-success data-correct:has-[[data-slot=input-group-control]:focus-visible]:ring-success/50 has-[[data-slot][aria-invalid=true]:focus-visible]:ring-destructive/50 dark:has-[[data-slot][aria-invalid=true]:focus-visible]:ring-destructive/50"
          data-correct={awaitingAdvance ? '' : undefined}
        >
          <InputGroupAddon align="inline-start">
            <span className="-ml-[0.3rem] flex size-8 items-center justify-center pointer-coarse:size-10">
              {correcting && (
                <XIcon aria-hidden="true" className="size-4 text-destructive" />
              )}
              {awaitingAdvance && (
                <CheckIcon aria-hidden="true" className="size-4 text-success" />
              )}
            </span>
          </InputGroupAddon>
          <InputGroupInput
            aria-describedby={feedbackId}
            aria-invalid={
              correcting || answerProblem === 'too-long' ? true : undefined
            }
            aria-labelledby={`${promptId} ${labelId}`}
            aria-readonly={awaitingAdvance ? true : undefined}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            autoFocus={focusInputOnMount}
            className="h-full text-center text-lg md:text-lg"
            enterKeyHint="go"
            id={inputId}
            onChange={(event) => {
              setAnswerProblem(null);
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
            value={input}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-expanded={session.hintShown}
              aria-label="Reading hint"
              onClick={() => {
                dispatch({ type: 'hint' });
                keepTyping();
              }}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              size="icon-sm"
            >
              <LightbulbIcon aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <div
          className="flex min-h-12 flex-col gap-1 text-sm"
          id={feedbackId}
          role="status"
        >
          {answerProblem === 'empty' && (
            <p className="text-muted-foreground">
              Type the reading first, or choose Skip.
            </p>
          )}
          {answerProblem === 'too-long' && (
            <p className="text-destructive">
              The answer is longer than {MAX_ANSWER_LENGTH} characters. Shorten
              it, or choose Skip.
            </p>
          )}
          {awaitingAdvance && (
            <p className="sr-only">Correct: {kana?.romaji}</p>
          )}
          {correcting && <p className="sr-only">Incorrect. Try again.</p>}
          {session.hintShown && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <LightbulbIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>
                Reading:{' '}
                <strong className="font-semibold text-foreground">
                  {kana?.romaji}
                </strong>
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setAnswerProblem(null);
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
        </div>
      </form>
    </div>
  );
};
