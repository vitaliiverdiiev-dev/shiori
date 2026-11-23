import type { KanaProgressStats } from '../model/types';

const PERCENT = 100;

export function describeProgress(stats: KanaProgressStats): string {
  return `Practised ${plural(stats.attempts, 'time')}, ${String(stats.independentCorrect)} correct on the first try without a hint.`;
}

export function formatPracticeDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function independentShare(stats: KanaProgressStats): number {
  return stats.attempts === 0
    ? 0
    : Math.round((stats.independentCorrect / stats.attempts) * PERCENT);
}

export function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

export function toProgressMap(
  entries: readonly KanaProgressStats[] | undefined,
): ReadonlyMap<string, KanaProgressStats> {
  return new Map(entries?.map((entry) => [entry.kanaId, entry]));
}
