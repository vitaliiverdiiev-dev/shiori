import type { Kana } from '../model/types';

export function isAcceptedReading(kana: Kana, answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  return kana.romaji === normalized || kana.alternatives.includes(normalized);
}

export function normalizeAnswer(answer: string): string {
  return answer.normalize('NFKC').trim().toLowerCase();
}
