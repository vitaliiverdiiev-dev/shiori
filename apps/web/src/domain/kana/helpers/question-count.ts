import { MAX_QUESTION_COUNT } from '../model/consts';

export function describeQuestionCount(
  count: number,
  kanaCount: number,
): string {
  const questions = `${String(count)} ${count === 1 ? 'question' : 'questions'}`;
  if (count < kanaCount) {
    return `${questions} from ${String(kanaCount)} kana`;
  }
  const fewest = Math.floor(count / kanaCount);
  const most = Math.ceil(count / kanaCount);
  const times = (value: number) =>
    value === 1 ? 'once' : `${String(value)} times`;
  return fewest === most
    ? `${questions} · each kana ${times(fewest)}`
    : `${questions} · each kana ${String(fewest)}–${times(most)}`;
}

export function parseQuestionCount(text: string): null | number {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const count = Number(trimmed);
  return count >= 1 && count <= MAX_QUESTION_COUNT ? count : null;
}
