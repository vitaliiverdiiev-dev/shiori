import {
  getKanaCatalog,
  getKanaSections,
  type Kana,
  type KanaScript,
} from '@shiori/kana';
import { useQuery } from '@tanstack/react-query';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
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
    <Tabs className="@container flex-1 gap-6" defaultValue="practice">
      <TabsList variant="line">
        <TabsTrigger value="practice">Practice</TabsTrigger>
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
      </TabsList>
      <TabsContent
        className="flex flex-1 flex-col gap-8 [&_*]:scroll-mt-20 [&_*]:scroll-mb-32 sm:[&_*]:scroll-mb-24"
        keepMounted
        value="practice"
      >
        <div className="grid items-start gap-8 @2xl:grid-cols-2 @4xl:grid-cols-[5fr_5fr_4fr]">
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
        </div>
        <div className="sticky bottom-0 z-10 mt-auto -mb-(--app-content-bottom,0px) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] before:absolute before:inset-y-0 before:-inset-x-[100vmax] before:-z-10 before:border-t before:border-border before:bg-background">
          <PracticeLauncher
            onRecordAttempts={attemptSync.record}
            script={script}
            selectedIds={catalog
              .filter(({ id }) => selection.has(id))
              .map(({ id }) => id)}
            selectionActions={
              <>
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
              </>
            }
            selectionStatus={
              <p className="text-sm" role="status">
                <span className="font-semibold tabular-nums">
                  {selectedCount}
                </span>{' '}
                selected
              </p>
            }
            userId={userId}
          />
        </div>
      </TabsContent>
      <TabsContent keepMounted value="statistics">
        <KanaProgress
          catalog={catalog}
          onDiscardRejected={attemptSync.discardRejected}
          onReload={() => void progressQuery.refetch()}
          onRetryRejected={attemptSync.retryRejected}
          onRetrySave={attemptSync.retry}
          progress={progress}
          saveStatus={attemptSync}
          status={progressQuery.status}
        />
      </TabsContent>
    </Tabs>
  );
};
