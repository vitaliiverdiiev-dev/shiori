import type { Kana, KanaAnswerMatch } from './types.js';

export function isAcceptedReading(kana: Kana, answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  return kana.romaji === normalized || kana.alternatives.includes(normalized);
}

export function isKanaAnswer(kana: Kana, answer: string): boolean {
  return normalizeKanaAnswer(answer) === kana.form;
}

export function matchKanaAnswers(
  expected: readonly Kana[],
  answers: readonly string[],
): KanaAnswerMatch[] {
  const unused = answers.map((answer) => answer.trim());
  const matched = expected.map((kana) => {
    const index = unused.findIndex((answer) => isKanaAnswer(kana, answer));
    return index === -1 ? null : (unused.splice(index, 1)[0] ?? null);
  });
  return expected.map((kana, index) => {
    const answer = matched[index] ?? null;
    return answer === null
      ? { answer: unused.shift() ?? '', correct: false, kana }
      : { answer, correct: true, kana };
  });
}

export function normalizeAnswer(answer: string): string {
  return answer.normalize('NFKC').trim().toLowerCase();
}

export function normalizeKanaAnswer(answer: string): string {
  return answer.normalize('NFKC').trim();
}
