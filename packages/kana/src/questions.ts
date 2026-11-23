import { findKana, findReadingGroup, toReadingGroups } from './catalog.js';
import type {
  Kana,
  KanaDirection,
  KanaPracticeMode,
  KanaQuestion,
} from './types.js';

export const kanaDirections = [
  'kana-to-romaji',
  'romaji-to-kana',
] as const satisfies readonly KanaDirection[];

export function buildQuestionOrder<T extends string>(
  units: readonly T[],
  questionCount: number,
  random: () => number = Math.random,
): T[] {
  const unique = [...new Set(units)];
  const order: T[] = [];
  while (unique.length > 0 && order.length < questionCount) {
    const cycle = shuffle(unique, random);
    const previous = order.at(-1);
    const first = cycle[0];
    if (cycle.length > 1 && first !== undefined && first === previous) {
      const swapIndex = 1 + Math.floor(random() * (cycle.length - 1));
      cycle[0] = cycle[swapIndex] ?? first;
      cycle[swapIndex] = first;
    }
    order.push(...cycle.slice(0, questionCount - order.length));
  }
  return order;
}

export function getExpectedKana(question: KanaQuestion): readonly Kana[] {
  if (question.direction === 'romaji-to-kana') {
    return findReadingGroup(question.readingId)?.kana ?? [];
  }
  const kana = findKana(question.kanaId);
  return kana ? [kana] : [];
}

export function planQuestions(
  units: readonly KanaQuestion[],
  questionCount: number,
  random: () => number = Math.random,
): KanaQuestion[] {
  const byKey = new Map(units.map((unit) => [questionKey(unit), unit]));
  return buildQuestionOrder([...byKey.keys()], questionCount, random).flatMap(
    (key) => byKey.get(key) ?? [],
  );
}

export function questionKey(question: KanaQuestion): string {
  return question.direction === 'romaji-to-kana'
    ? question.readingId
    : question.kanaId;
}

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    const swapped = result[swapIndex];
    if (current === undefined || swapped === undefined) continue;
    result[index] = swapped;
    result[swapIndex] = current;
  }
  return result;
}

export function toQuestionUnits(
  kanaIds: readonly string[],
  mode: KanaPracticeMode,
): KanaQuestion[] {
  const forward: KanaQuestion[] = [
    ...new Set(kanaIds.flatMap((id) => findKana(id)?.id ?? [])),
  ].map((kanaId) => ({ direction: 'kana-to-romaji', kanaId }));
  const reverse: KanaQuestion[] = toReadingGroups(kanaIds).map(({ id }) => ({
    direction: 'romaji-to-kana',
    readingId: id,
  }));
  if (mode === 'kana-to-romaji') return forward;
  if (mode === 'romaji-to-kana') return reverse;
  return [...forward, ...reverse];
}
