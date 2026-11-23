import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/shared/ui';
import { findKana } from '../helpers/catalog';
import { summarizeSession } from '../helpers/session';
import type { KanaPracticeSession } from '../model/types';

type Props = {
  onRestart: () => void;
  onRetry: () => void;
  selectionPath: string;
  session: KanaPracticeSession;
};

export const PracticeSummary = ({
  onRestart,
  onRetry,
  selectionPath,
  session,
}: Props) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const summary = summarizeSession(session);
  const missed = summary.missed.flatMap((id) => findKana(id) ?? []);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h1
        className="text-2xl font-semibold tracking-tight outline-none"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        Round complete
      </h1>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        {(
          [
            ['Questions', summary.total],
            ['Correct', summary.correct],
            ['With hint', summary.assisted],
            ['Incorrect', summary.incorrect],
            ['Skipped', summary.skipped],
          ] as const
        ).map(([label, value]) => (
          <div className="flex flex-col" key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {missed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">To review</h2>
          <ul className="flex flex-wrap gap-2">
            {missed.map((kana) => (
              <li
                className="flex min-w-14 flex-col items-center rounded-lg border px-2 py-1.5"
                key={kana.id}
              >
                <span className="text-2xl leading-tight" lang="ja">
                  {kana.form}
                </span>
                <span className="text-xs text-muted-foreground">
                  {kana.romaji}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {missed.length > 0 && (
          <Button onClick={onRetry} size="lg">
            Retry {missed.length} missed
          </Button>
        )}
        <Button
          onClick={onRestart}
          size="lg"
          variant={missed.length > 0 ? 'outline' : 'default'}
        >
          Practice the same selection again
        </Button>
        <Link
          className={buttonVariants({ size: 'lg', variant: 'ghost' })}
          to={selectionPath}
        >
          Back to selection
        </Link>
      </div>
    </section>
  );
};
