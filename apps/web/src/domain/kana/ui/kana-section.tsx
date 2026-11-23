import { useId } from 'react';
import type { Kana, KanaId, KanaSectionGroup } from '@shiori/kana';
import { Checkbox } from '@/shared/ui';
import { countSelected, getGroupState } from '../helpers/selection';
import type { KanaProgressStats } from '../model/types';
import { KanaRow } from './kana-row';
import { kanaSectionVariants } from './kana-section-variants';

type Props = {
  onRowChange: (row: readonly Kana[], pressedIds: readonly string[]) => void;
  onSelectGroup: (kana: readonly Kana[], selected: boolean) => void;
  progress: ReadonlyMap<string, KanaProgressStats>;
  section: KanaSectionGroup;
  selection: ReadonlySet<KanaId>;
};

export const KanaSection = ({
  onRowChange,
  onSelectGroup,
  progress,
  section,
  selection,
}: Props) => {
  const headingId = useId();
  const state = getGroupState(selection, section.kana);

  return (
    <section
      aria-labelledby={headingId}
      className={kanaSectionVariants({ section: section.id })}
    >
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
            progress={progress}
            row={row}
            section={section.id}
            selection={selection}
          />
        ))}
      </div>
    </section>
  );
};
