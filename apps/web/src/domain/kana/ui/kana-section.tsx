import { useId } from 'react';
import { Checkbox } from '@/shared/ui';
import { countSelected, getGroupState } from '../helpers/selection';
import type { Kana, KanaId, KanaSectionGroup } from '../model/types';
import { KanaRow } from './kana-row';

type Props = {
  onRowChange: (row: readonly Kana[], pressedIds: readonly string[]) => void;
  onSelectGroup: (kana: readonly Kana[], selected: boolean) => void;
  section: KanaSectionGroup;
  selection: ReadonlySet<KanaId>;
};

export const KanaSection = ({
  onRowChange,
  onSelectGroup,
  section,
  selection,
}: Props) => {
  const headingId = useId();
  const state = getGroupState(selection, section.kana);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-lg font-semibold tracking-tight" id={headingId}>
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 pl-2.5">
              <Checkbox
                aria-label={`Select all ${section.title}`}
                checked={state === 'all'}
                indeterminate={state === 'some'}
                onCheckedChange={(checked) => {
                  onSelectGroup(section.kana, checked);
                }}
              />
              {section.title}
            </label>
          </h2>
          <p className="pl-2.5 text-sm text-muted-foreground">
            {section.description}
          </p>
        </div>
        <p className="mt-3 shrink-0 text-sm text-muted-foreground tabular-nums">
          {countSelected(selection, section.kana)} / {section.kana.length}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {section.rows.map((row) => (
          <KanaRow
            key={row.id}
            onRowChange={onRowChange}
            onSelectGroup={onSelectGroup}
            row={row}
            section={section.id}
            selection={selection}
          />
        ))}
      </div>
    </section>
  );
};
