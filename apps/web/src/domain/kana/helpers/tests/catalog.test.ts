import { describe, expect, it } from 'vitest';
import { getKanaCatalog, getKanaSections } from '../catalog';

describe('getKanaCatalog', () => {
  it.each(['hiragana', 'katakana'] as const)(
    'gives every %s form a unique, script-prefixed id and a display order',
    (script) => {
      const catalog = getKanaCatalog(script);

      expect(catalog).toHaveLength(104);
      expect(new Set(catalog.map(({ id }) => id)).size).toBe(catalog.length);
      expect(catalog.every(({ id }) => id.startsWith(`${script}:`))).toBe(true);
      expect(catalog.map(({ order }) => order)).toEqual(
        catalog.map((_, index) => index),
      );
    },
  );

  it('keeps hiragana and katakana ids distinct', () => {
    const ids = [
      ...getKanaCatalog('hiragana'),
      ...getKanaCatalog('katakana'),
    ].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links each form to its counterpart in the other script', () => {
    const katakana = new Map(
      getKanaCatalog('katakana').map((kana) => [kana.id, kana]),
    );

    for (const hiragana of getKanaCatalog('hiragana')) {
      const counterpart = katakana.get(hiragana.counterpartId);
      expect(counterpart?.counterpartId).toBe(hiragana.id);
      expect(counterpart?.order).toBe(hiragana.order);
      expect(counterpart?.romaji).toBe(hiragana.romaji);
    }
  });

  it.each([
    ['あ', 'hiragana:a', 'a', []],
    ['ア', 'katakana:a', 'a', []],
    ['し', 'hiragana:si', 'shi', ['si']],
    ['ち', 'hiragana:ti', 'chi', ['ti']],
    ['きゅ', 'hiragana:kyu', 'kyu', []],
    ['ギョ', 'katakana:gyo', 'gyo', []],
    ['ぢ', 'hiragana:di', 'ji', ['di']],
    ['ヅ', 'katakana:du', 'zu', ['du']],
  ])('reads %s (%s) as %s', (form, id, romaji, alternatives) => {
    const kana = [
      ...getKanaCatalog('hiragana'),
      ...getKanaCatalog('katakana'),
    ].find((candidate) => candidate.form === form);

    expect(kana).toMatchObject({ id, romaji });
    expect(kana?.alternatives).toEqual(alternatives);
  });
});

describe('getKanaSections', () => {
  it('groups kana into basic, dakuten and yōon sections in that order', () => {
    expect(
      getKanaSections('katakana').map(({ id, kana }) => [id, kana.length]),
    ).toEqual([
      ['basic', 46],
      ['dakuten', 25],
      ['yoon', 33],
    ]);
  });

  it('keeps gojūon gaps as empty cells and labels rows by their first kana', () => {
    const [basic] = getKanaSections('hiragana');
    const ya = basic?.rows.find(({ id }) => id === 'ya');

    expect(ya?.label).toBe('や');
    expect(ya?.cells.map((cell) => cell?.form ?? null)).toEqual([
      'や',
      null,
      'ゆ',
      null,
      'よ',
    ]);
    expect(ya?.kana.map(({ form }) => form)).toEqual(['や', 'ゆ', 'よ']);
  });
});
