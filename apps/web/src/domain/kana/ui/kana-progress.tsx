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
  const practised = catalog.flatMap((kana) => {
    const stats = progress.get(kana.id);
    return stats ? [{ kana, stats }] : [];
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="text-muted-foreground" role="status">
          {status === 'pending' && 'Loading statistics…'}
          {status === 'error' && 'Statistics could not be loaded.'}
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
            Reload statistics
          </Button>
        )}
        {saveStatus.status === 'waiting' && (
          <Button onClick={onRetrySave} size="sm" variant="outline">
            Save now
          </Button>
        )}
      </div>

      {practised.length > 0 && (
        <>
          <div className="rounded-lg border">
            <Table className="tabular-nums">
              <TableCaption className="sr-only">
                Statistics per kana, counted by the first answer to each
                question
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                    <TableCell className="text-right">
                      {stats.attempts}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.independentCorrect}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.assistedCorrect}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.incorrect}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.skipped}
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      {formatPracticeDate(stats.lastPracticedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Each question counts once, by its first answer. Incorrect includes
            answers corrected later, with or without a hint. The bar under a
            kana on the Practice tab shows its share of Correct, no hint.
          </p>
        </>
      )}
    </div>
  );
};
