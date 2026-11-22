import { kanaRows, kanaSectionOrder, kanaSections } from '../model/catalog';
import type {
  Kana,
  KanaId,
  KanaRow,
  KanaScript,
  KanaSectionGroup,
} from '../model/types';

const sectionsByScript: Record<KanaScript, readonly KanaSectionGroup[]> = {
  hiragana: buildSections('hiragana'),
  katakana: buildSections('katakana'),
};

function buildSections(script: KanaScript): KanaSectionGroup[] {
  const counterpart = script === 'hiragana' ? 'katakana' : 'hiragana';
  let order = 0;
  return kanaSectionOrder.map((section) => {
    const rows = kanaRows
      .filter((row) => row.section === section)
      .map((row): KanaRow => {
        const cells = row.sounds.map((sound): Kana | null => {
          if (!sound) return null;
          const kana: Kana = {
            id: toKanaId(script, sound.id),
            alternatives: sound.alternatives ?? [],
            counterpartId: toKanaId(counterpart, sound.id),
            form: sound[script],
            order,
            romaji: sound.romaji,
            rowId: row.id,
            script,
            section,
            soundId: sound.id,
          };
          order += 1;
          return kana;
        });
        const kana = cells.filter((cell) => cell !== null);
        return { id: row.id, cells, kana, label: kana[0]?.form ?? row.id };
      });
    return {
      id: section,
      ...kanaSections[section],
      kana: rows.flatMap((row) => row.kana),
      rows,
    };
  });
}

export function getKanaCatalog(script: KanaScript): readonly Kana[] {
  return getKanaSections(script).flatMap(({ kana }) => kana);
}

export function getKanaSections(
  script: KanaScript,
): readonly KanaSectionGroup[] {
  return sectionsByScript[script];
}

export function toKanaId(script: KanaScript, soundId: string): KanaId {
  return `${script}:${soundId}`;
}
