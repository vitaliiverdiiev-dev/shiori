import { kanaRows, kanaSectionOrder, kanaSections } from './catalog-data.js';
import type {
  Kana,
  KanaId,
  KanaReadingGroup,
  KanaReadingId,
  KanaRow,
  KanaScript,
  KanaSectionGroup,
} from './types.js';

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

const kanaById = new Map<string, Kana>(
  [...sectionsByScript.hiragana, ...sectionsByScript.katakana].flatMap(
    ({ kana }) => kana.map((entry) => [entry.id, entry] as const),
  ),
);

const readingGroupsByScript: Record<KanaScript, readonly KanaReadingGroup[]> = {
  hiragana: buildReadingGroups('hiragana'),
  katakana: buildReadingGroups('katakana'),
};

function buildReadingGroups(script: KanaScript): KanaReadingGroup[] {
  const groups = new Map<string, Kana[]>();
  for (const kana of getKanaCatalog(script)) {
    groups.set(kana.romaji, [...(groups.get(kana.romaji) ?? []), kana]);
  }
  return [...groups].map(([romaji, kana]) => ({
    id: toReadingId(script, romaji),
    kana,
    romaji,
    script,
  }));
}

const readingGroupById = new Map<string, KanaReadingGroup>(
  [...readingGroupsByScript.hiragana, ...readingGroupsByScript.katakana].map(
    (group) => [group.id, group] as const,
  ),
);

export function findKana(id: string): Kana | undefined {
  return kanaById.get(id);
}

export function findReadingGroup(id: string): KanaReadingGroup | undefined {
  return readingGroupById.get(id);
}

export function getKanaCatalog(script: KanaScript): readonly Kana[] {
  return getKanaSections(script).flatMap(({ kana }) => kana);
}

export function getKanaSections(
  script: KanaScript,
): readonly KanaSectionGroup[] {
  return sectionsByScript[script];
}

export function getReadingGroups(
  script: KanaScript,
): readonly KanaReadingGroup[] {
  return readingGroupsByScript[script];
}

export function toKanaId(script: KanaScript, soundId: string): KanaId {
  return `${script}:${soundId}`;
}

export function toReadingGroups(
  kanaIds: readonly string[],
): KanaReadingGroup[] {
  const ids = new Set(
    kanaIds.flatMap((id) => {
      const kana = findKana(id);
      return kana ? [toReadingId(kana.script, kana.romaji)] : [];
    }),
  );
  return [...readingGroupById.values()].filter(({ id }) => ids.has(id));
}

export function toReadingId(script: KanaScript, romaji: string): KanaReadingId {
  return `${script}/${romaji}`;
}
