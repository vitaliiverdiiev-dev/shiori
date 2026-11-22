import { useState } from 'react';
import { Button } from '@/shared/ui';
import { getKanaCatalog, getKanaSections } from './helpers/catalog';
import {
  countSelected,
  setGroupSelected,
  setRowSelection,
} from './helpers/selection';
import type { Kana, KanaId, KanaScript } from './model/types';
import { KanaSection } from './ui/kana-section';

type Props = {
  script: KanaScript;
};

export const KanaSelection = ({ script }: Props) => {
  const [selection, setSelection] = useState<ReadonlySet<KanaId>>(
    () => new Set(),
  );
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
      </div>
      {getKanaSections(script).map((section) => (
        <KanaSection
          key={section.id}
          onRowChange={changeRow}
          onSelectGroup={selectGroup}
          section={section}
          selection={selection}
        />
      ))}
    </div>
  );
};
