import type { KanaId } from '@shiori/kana';
import { getKanaSections } from '@shiori/kana';
import { describe, expect, it } from 'vitest';
import {
  countSelected,
  getGroupState,
  setGroupSelected,
  setRowSelection,
} from '../selection';

const [basic] = getKanaSections('hiragana');
const row = basic?.rows.find(({ id }) => id === 'ka')?.kana ?? [];
const outside: KanaId = 'hiragana:a';

describe('kana selection', () => {
  it('reports none, some and all for a group', () => {
    expect(getGroupState(new Set(), row)).toBe('none');
    expect(getGroupState(new Set(['hiragana:ki']), row)).toBe('some');
    expect(getGroupState(new Set(row.map(({ id }) => id)), row)).toBe('all');
  });

  it('selects and clears a whole group without touching other kana', () => {
    const selected = setGroupSelected(
      new Set([outside, 'hiragana:ki']),
      row,
      true,
    );
    expect(countSelected(selected, row)).toBe(row.length);
    expect(selected.has(outside)).toBe(true);

    const cleared = setGroupSelected(selected, row, false);
    expect(countSelected(cleared, row)).toBe(0);
    expect(cleared.has(outside)).toBe(true);
  });

  it('replaces a row selection with the pressed ids of that row only', () => {
    const next = setRowSelection(new Set([outside, 'hiragana:ka']), row, [
      'hiragana:ku',
      'hiragana:ko',
    ]);
    expect([...next].sort()).toEqual(
      [outside, 'hiragana:ko', 'hiragana:ku'].sort(),
    );
  });

  it('never mutates the current selection', () => {
    const current = new Set<KanaId>([outside]);
    setGroupSelected(current, row, true);
    setRowSelection(current, row, ['hiragana:ka']);
    expect([...current]).toEqual([outside]);
  });
});
