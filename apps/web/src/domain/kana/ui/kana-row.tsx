import { Checkbox, ToggleGroup, ToggleGroupItem } from '@/shared/ui';
import { getGroupState } from '../helpers/selection';
import type {
  Kana,
  KanaId,
  KanaRow as KanaRowData,
  KanaSection,
} from '../model/types';
import { kanaRowVariants } from './kana-row-variants';

type Props = {
  onRowChange: (row: readonly Kana[], pressedIds: readonly string[]) => void;
  onSelectGroup: (kana: readonly Kana[], selected: boolean) => void;
  row: KanaRowData;
  section: KanaSection;
  selection: ReadonlySet<KanaId>;
};

export const KanaRow = ({
  onRowChange,
  onSelectGroup,
  row,
  section,
  selection,
}: Props) => {
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
        {row.cells.map((kana, column) =>
          kana ? (
            <ToggleGroupItem
              className="h-auto min-h-14 min-w-0 flex-col gap-1 px-1 py-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground sm:min-h-16"
              key={kana.id}
              value={kana.id}
            >
              <span className="text-2xl leading-none font-normal" lang="ja">
                {kana.form}
              </span>{' '}
              <span className="text-xs leading-none text-muted-foreground group-aria-pressed/toggle:text-primary-foreground">
                {kana.romaji}
              </span>
            </ToggleGroupItem>
          ) : (
            <span aria-hidden="true" key={`empty-${String(column)}`} />
          ),
        )}
      </ToggleGroup>
    </div>
  );
};
