import type { Kana, KanaGroupState, KanaId } from '../model/types';

export function countSelected(
  selection: ReadonlySet<KanaId>,
  kana: readonly Kana[],
): number {
  return kana.filter(({ id }) => selection.has(id)).length;
}

export function getGroupState(
  selection: ReadonlySet<KanaId>,
  kana: readonly Kana[],
): KanaGroupState {
  const selected = countSelected(selection, kana);
  if (selected === 0) return 'none';
  return selected === kana.length ? 'all' : 'some';
}

export function setGroupSelected(
  selection: ReadonlySet<KanaId>,
  kana: readonly Kana[],
  selected: boolean,
): ReadonlySet<KanaId> {
  const next = new Set(selection);
  for (const { id } of kana) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function setRowSelection(
  selection: ReadonlySet<KanaId>,
  row: readonly Kana[],
  pressedIds: readonly string[],
): ReadonlySet<KanaId> {
  const next = new Set(selection);
  for (const { id } of row) {
    if (pressedIds.includes(id)) next.add(id);
    else next.delete(id);
  }
  return next;
}
