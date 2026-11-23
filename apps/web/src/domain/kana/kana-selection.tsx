import {
  getKanaCatalog,
  getKanaSections,
  type Kana,
  type KanaScript,
} from '@shiori/kana';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui';
import { kanaProgressQuery } from './api/queries';
import { toProgressMap } from './helpers/progress';
import {
  countSelected,
  setGroupSelected,
  setRowSelection,
} from './helpers/selection';
import { useAttemptSync } from './hooks/use-attempt-sync';
import { useStoredSelection } from './hooks/use-stored-selection';
import { KanaProgress } from './ui/kana-progress';
import { KanaSection } from './ui/kana-section';
import { PracticeLauncher } from './ui/practice-launcher';

type Props = {
  script: KanaScript;
  userId: string | undefined;
};

export const KanaSelection = ({ script, userId }: Props) => {
  const [selection, setSelection] = useStoredSelection(script, userId);
  const attemptSync = useAttemptSync(userId);
  const progressQuery = useQuery(kanaProgressQuery(script));
  const progress = toProgressMap(progressQuery.data?.kana);
  const catalog = getKanaCatalog(script);
  const selectedCount = countSelected(selection, catalog);
  const selectGroup = (kana: readonly Kana[], selected: boolean) => {
    setSelection((current) => setGroupSelected(current, kana, selected));
  };
  const changeRow = (row: readonly Kana[], pressedIds: readonly string[]) => {
    setSelection((current) => setRowSelection(current, row, pressedIds));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background py-3">
        <p className="text-sm" role="status">
          <span className="font-semibold tabular-nums">{selectedCount}</span> of{' '}
          {catalog.length} selected
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            disabled={selectedCount === catalog.length}
            focusableWhenDisabled
            onClick={() => {
              selectGroup(catalog, true);
            }}
            variant="outline"
          >
            Select all
          </Button>
          <Button
            disabled={selectedCount === 0}
            focusableWhenDisabled
            onClick={() => {
              setSelection(new Set());
            }}
            variant="ghost"
          >
            Clear
          </Button>
        </div>
        <PracticeLauncher
          script={script}
          selectedIds={catalog
            .filter(({ id }) => selection.has(id))
            .map(({ id }) => id)}
          userId={userId}
        />
      </div>
      {getKanaSections(script).map((section) => (
        <KanaSection
          key={section.id}
          onRowChange={changeRow}
          onSelectGroup={selectGroup}
          progress={progress}
          section={section}
          selection={selection}
        />
      ))}
      <KanaProgress
        catalog={catalog}
        onReload={() => void progressQuery.refetch()}
        onRetrySave={attemptSync.retry}
        progress={progress}
        saveStatus={attemptSync}
        status={progressQuery.status}
      />
    </div>
  );
};
