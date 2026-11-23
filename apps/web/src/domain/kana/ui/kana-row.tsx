import { useId } from 'react';
import type {
  Kana,
  KanaId,
  KanaRow as KanaRowData,
  KanaSection,
} from '@shiori/kana';
import { Checkbox, ToggleGroup, ToggleGroupItem } from '@/shared/ui';
import { describeProgress, independentShare } from '../helpers/progress';
import { getGroupState } from '../helpers/selection';
import type { KanaProgressStats } from '../model/types';
import { kanaRowVariants } from './kana-row-variants';

type Props = {
  onRowChange: (row: readonly Kana[], pressedIds: readonly string[]) => void;
  onSelectGroup: (kana: readonly Kana[], selected: boolean) => void;
  progress: ReadonlyMap<string, KanaProgressStats>;
  row: KanaRowData;
  section: KanaSection;
  selection: ReadonlySet<KanaId>;
};

export const KanaRow = ({
  onRowChange,
  onSelectGroup,
  progress,
  row,
  section,
  selection,
}: Props) => {
  const descriptionId = useId();
  const state = getGroupState(selection, row.kana);
  const label = `${row.label} row`;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <label className="flex min-h-11 w-9 shrink-0 cursor-pointer items-center justify-center">
        <Checkbox
          aria-label={label}
          checked={state === 'all'}
          indeterminate={state === 'some'}
          onCheckedChange={(checked) => {
            onSelectGroup(row.kana, checked);
          }}
        />
      </label>
      <ToggleGroup
        aria-label={label}
        className={kanaRowVariants({ section })}
        multiple
        onValueChange={(pressedIds) => {
          onRowChange(row.kana, pressedIds);
        }}
        spacing={1}
        value={row.kana
          .filter(({ id }) => selection.has(id))
          .map(({ id }) => id)}
        variant="outline"
      >
        {row.cells.map((kana, column) => {
          if (!kana) {
            return <span aria-hidden="true" key={`empty-${String(column)}`} />;
          }
          const stats = progress.get(kana.id);
          const statsId = `${descriptionId}-${kana.soundId}`;
          return (
            <ToggleGroupItem
              aria-describedby={stats && statsId}
              className="relative h-auto min-h-14 min-w-0 flex-col gap-1 px-1 py-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground sm:min-h-16"
              key={kana.id}
              value={kana.id}
            >
              <span className="text-2xl leading-none font-normal" lang="ja">
                {kana.form}
              </span>{' '}
              <span className="text-xs leading-none text-muted-foreground group-aria-pressed/toggle:text-primary-foreground">
                {kana.romaji}
              </span>
              {stats && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-muted-foreground/25 group-aria-pressed/toggle:bg-primary-foreground/30"
                    data-slot="kana-progress"
                  >
                    <span
                      className="block h-full bg-success group-aria-pressed/toggle:bg-primary-foreground"
                      style={{ width: `${String(independentShare(stats))}%` }}
                    />
                  </span>
                  <span hidden id={statsId}>
                    {describeProgress(stats)}
                  </span>
                </>
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
};
