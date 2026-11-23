import { useId } from 'react';
import type { Kana } from '@shiori/kana';
import {
  Button,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
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
              : `${String(practised.length)} kana practised, ${plural(
                  practised.reduce((sum, { stats }) => sum + stats.attempts, 0),
                  'question',
                )} recorded.`)}
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
            Each question counts once, by its first answer. Correct, no hint:
            right on the first try. Correct with hint: right on the first try
            after showing the reading. Incorrect: wrong first answer, even if a
            hint was used afterwards and it was retyped correctly. Skipped:
            skipped before answering.
          </p>
          <Table className="tabular-nums">
            <TableCaption className="sr-only">Statistics per kana</TableCaption>
            <TableHeader>
              <TableRow className="border-t hover:bg-transparent">
                <TableHead className="px-3" scope="col">
                  Kana
                </TableHead>
                <TableHead className="text-right" scope="col">
                  Questions
                </TableHead>
                <TableHead className="text-right" scope="col">
                  Correct, no hint
                </TableHead>
                <TableHead className="text-right" scope="col">
                  Correct with hint
                </TableHead>
                <TableHead className="text-right" scope="col">
                  Incorrect
                </TableHead>
                <TableHead className="text-right" scope="col">
                  Skipped
                </TableHead>
                <TableHead className="px-3 text-right" scope="col">
                  Last practised
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {practised.map(({ kana, stats }) => (
                <TableRow key={kana.id}>
                  <TableHead className="px-3 font-normal" scope="row">
                    <span className="text-lg" lang="ja">
                      {kana.form}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">
                      {kana.romaji}
                    </span>
                  </TableHead>
                  <TableCell className="text-right">{stats.attempts}</TableCell>
                  <TableCell className="text-right">
                    {stats.independentCorrect}
                  </TableCell>
                  <TableCell className="text-right">
                    {stats.assistedCorrect}
                  </TableCell>
                  <TableCell className="text-right">
                    {stats.incorrect}
                  </TableCell>
                  <TableCell className="text-right">{stats.skipped}</TableCell>
                  <TableCell className="px-3 text-right">
                    {formatPracticeDate(stats.lastPracticedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      )}
    </section>
  );
};
