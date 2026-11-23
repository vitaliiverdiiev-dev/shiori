import { useId } from 'react';
import type { Kana } from '@shiori/kana';
import { Button } from '@/shared/ui';
import { formatPracticeDate, plural } from '../helpers/progress';
import type { AttemptSyncSnapshot, KanaProgressStats } from '../model/types';

type Props = {
  catalog: readonly Kana[];
  onReload: () => void;
  onRetrySave: () => void;
  progress: ReadonlyMap<string, KanaProgressStats>;
  saveStatus: AttemptSyncSnapshot;
  status: 'error' | 'pending' | 'success';
};

export const KanaProgress = ({
  catalog,
  onReload,
  onRetrySave,
  progress,
  saveStatus,
  status,
}: Props) => {
  const headingId = useId();
  const practised = catalog.flatMap((kana) => {
    const stats = progress.get(kana.id);
    return stats ? [{ kana, stats }] : [];
  });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight" id={headingId}>
          Progress
        </h2>
        <p className="text-sm text-muted-foreground">
          Kana → romaji, counted by the first answer to each question. The bar
          under a practised kana shows the share of its questions answered
          correctly on the first try without a hint.
        </p>
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="text-muted-foreground" role="status">
          {status === 'pending' && 'Loading progress…'}
          {status === 'error' && 'Progress could not be loaded.'}
          {status === 'success' &&
            (practised.length === 0
              ? 'Nothing recorded yet. Each question is saved when you finish it.'
              : `${String(practised.length)} kana practised.`)}
          {saveStatus.pending > 0 &&
            ` ${plural(saveStatus.pending, 'result')} from this device not saved yet.`}
          {saveStatus.rejected > 0 &&
            ` ${plural(saveStatus.rejected, 'result')} refused by the server and kept on this device.`}
        </p>
        {status === 'error' && (
          <Button onClick={onReload} size="sm" variant="outline">
            Reload progress
          </Button>
        )}
        {saveStatus.status === 'waiting' && (
          <Button onClick={onRetrySave} size="sm" variant="outline">
            Save now
          </Button>
        )}
      </div>

      {practised.length > 0 && (
        <details className="group rounded-lg border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Details per kana
          </summary>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Correct: first try without a hint. With hint: first try after
            showing the reading. Incorrect: wrong first answer, even if retyped
            correctly later. Skipped: skipped before answering.
          </p>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Statistics per kana</caption>
              <thead className="text-xs text-muted-foreground">
                <tr className="border-t">
                  <th className="px-3 py-2 text-left font-medium" scope="col">
                    Kana
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    Questions
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    Correct
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    With hint
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    Incorrect
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    Skipped
                  </th>
                  <th className="px-3 py-2 text-right font-medium" scope="col">
                    Last practised
                  </th>
                </tr>
              </thead>
              <tbody>
                {practised.map(({ kana, stats }) => (
                  <tr className="border-t" key={kana.id}>
                    <th
                      className="px-3 py-1.5 text-left font-normal whitespace-nowrap"
                      scope="row"
                    >
                      <span className="text-lg" lang="ja">
                        {kana.form}
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {kana.romaji}
                      </span>
                    </th>
                    <td className="px-2 py-1.5 text-right">{stats.attempts}</td>
                    <td className="px-2 py-1.5 text-right">
                      {stats.independentCorrect}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {stats.assistedCorrect}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {stats.incorrect}
                    </td>
                    <td className="px-2 py-1.5 text-right">{stats.skipped}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      {formatPracticeDate(stats.lastPracticedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
};
