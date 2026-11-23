import { describe, expect, it } from 'vitest';
import { kanaRows } from '../catalog-data.js';
import type { KanaSection, KanaSoundDefinition } from '../types.js';

const sounds = kanaRows.flatMap(({ sounds }) =>
  sounds.filter((sound) => sound !== null),
);

const soundsIn = (section: KanaSection) =>
  kanaRows
    .filter((row) => row.section === section)
    .flatMap(({ sounds }) => sounds.filter((sound) => sound !== null));

const rowById = (id: string) => {
  const row = kanaRows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`Missing row ${id}`);
  return row.sounds;
};

const KATAKANA_OFFSET = 0x60;
const DAKUTEN = '゙';
const HANDAKUTEN = '゚';

const nihonShikiToHepburn: Record<string, string> = {
  di: 'ji',
  du: 'zu',
  hu: 'fu',
  si: 'shi',
  ti: 'chi',
  tu: 'tsu',
  zi: 'ji',
};

function toHepburn(id: string): string {
  return (
    nihonShikiToHepburn[id] ??
    id.replace(/^sy/, 'sh').replace(/^ty/, 'ch').replace(/^zy/, 'j')
  );
}

describe('kana catalog', () => {
  it('lists the gojūon in traditional order, without obsolete ゐ and ゑ', () => {
    const basic = soundsIn('basic');

    expect(basic.map(({ hiragana }) => hiragana).join('')).toBe(
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    );
    expect(basic.map(({ katakana }) => katakana).join('')).toBe(
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    );
  });

  it('counts 46 basic, 25 dakuten/handakuten and 33 yōon sounds', () => {
    expect(soundsIn('basic')).toHaveLength(46);
    expect(soundsIn('dakuten')).toHaveLength(25);
    expect(soundsIn('yoon')).toHaveLength(33);
  });

  it('gives every sound a unique id', () => {
    const ids = sounds.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every row on the grid of its section', () => {
    for (const row of kanaRows) {
      expect(row.sounds).toHaveLength(row.section === 'yoon' ? 3 : 5);
      expect(row.sounds[0]).not.toBeNull();
    }
  });

  it('pairs each hiragana form with the katakana form of the same sound', () => {
    for (const { hiragana, katakana } of sounds) {
      expect(
        Array.from(hiragana, (char) =>
          String.fromCodePoint((char.codePointAt(0) ?? 0) + KATAKANA_OFFSET),
        ).join(''),
      ).toBe(katakana);
    }
  });

  it.each([
    ['ga', 'ka', DAKUTEN],
    ['za', 'sa', DAKUTEN],
    ['da', 'ta', DAKUTEN],
    ['ba', 'ha', DAKUTEN],
    ['pa', 'ha', HANDAKUTEN],
  ])(
    'derives the %s row from the %s row with its voicing mark',
    (voiced, base, mark) => {
      const baseRow = rowById(base);
      rowById(voiced).forEach((sound, column) => {
        const baseSound = baseRow[column];
        expect(sound?.hiragana).toBe(
          `${baseSound?.hiragana ?? ''}${mark}`.normalize('NFC'),
        );
        expect(sound?.katakana).toBe(
          `${baseSound?.katakana ?? ''}${mark}`.normalize('NFC'),
        );
      });
    },
  );

  it.each([
    ['kya', 'ki'],
    ['sya', 'si'],
    ['tya', 'ti'],
    ['nya', 'ni'],
    ['hya', 'hi'],
    ['mya', 'mi'],
    ['rya', 'ri'],
    ['gya', 'gi'],
    ['zya', 'zi'],
    ['bya', 'bi'],
    ['pya', 'pi'],
  ])('builds the %s row from %s and a small ya, yu, yo', (row, base) => {
    const baseSound = sounds.find(({ id }) => id === base);
    expect(rowById(row).map((sound) => sound?.hiragana)).toEqual(
      ['ゃ', 'ゅ', 'ょ'].map((small) => `${baseSound?.hiragana ?? ''}${small}`),
    );
  });

  it('excludes the rarely used ぢゃ, ぢゅ and ぢょ', () => {
    expect(sounds.map(({ hiragana }) => hiragana)).not.toEqual(
      expect.arrayContaining(['ぢゃ']),
    );
  });

  it('uses modern Hepburn as the canonical reading, with wo for を', () => {
    for (const { id, romaji } of sounds) {
      expect(romaji).toBe(toHepburn(id));
    }
    expect(sounds.find(({ id }) => id === 'wo')).toMatchObject({
      alternatives: ['o'],
      romaji: 'wo',
    });
  });

  it('accepts the Nihon-shiki/Kunrei-shiki spelling where Hepburn differs', () => {
    for (const { id, alternatives = [], romaji } of sounds) {
      if (romaji !== id) expect(alternatives).toContain(id);
      expect(alternatives).not.toContain(romaji);
    }
    expect(sounds.find(({ id }) => id === 'n')?.alternatives).toEqual([
      'nn',
      "n'",
    ]);
  });

  it.each([
    ['tya', ['tya', 'cya']],
    ['tyu', ['tyu', 'cyu']],
    ['tyo', ['tyo', 'cyo']],
    ['zya', ['zya', 'jya']],
    ['zyu', ['zyu', 'jyu']],
    ['zyo', ['zyo', 'jyo']],
  ])('also accepts the common IME spellings for %s', (id, alternatives) => {
    expect(sounds.find((sound) => sound.id === id)?.alternatives).toEqual(
      alternatives,
    );
  });

  it('lets an alternative match another kana’s reading only for を → o', () => {
    const readings = new Set(sounds.map(({ romaji }) => romaji));
    const overlaps = sounds.flatMap(({ id, alternatives = [] }) =>
      alternatives
        .filter((alternative) => readings.has(alternative))
        .map((alternative) => [id, alternative]),
    );
    expect(overlaps).toEqual([['wo', 'o']]);
  });

  it('shares a reading only between distinct kana that sound alike', () => {
    const byReading = new Map<string, KanaSoundDefinition[]>();
    for (const sound of sounds) {
      byReading.set(sound.romaji, [
        ...(byReading.get(sound.romaji) ?? []),
        sound,
      ]);
    }
    const shared = [...byReading]
      .filter(([, group]) => group.length > 1)
      .map(([romaji, group]) => [
        romaji,
        group.map(({ hiragana }) => hiragana),
      ]);

    expect(shared).toEqual([
      ['ji', ['じ', 'ぢ']],
      ['zu', ['ず', 'づ']],
    ]);
  });
});
