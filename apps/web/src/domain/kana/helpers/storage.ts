import type { KanaId, KanaQuestion, KanaScript } from '@shiori/kana';
import {
  findReadingGroup,
  getExpectedKana,
  getKanaCatalog,
} from '@shiori/kana';
import {
  KANA_STORAGE_PREFIX,
  KANA_STORAGE_VERSION,
  MAX_ANSWER_LENGTH,
} from '../model/consts';
import {
  type LegacyKanaSession,
  legacyKanaStateSchema,
  type StoredKanaSession,
  storedKanaStateSchema,
} from '../model/schema';
import type {
  KanaAttempt,
  KanaPracticeSession,
  KanaQuestionResult,
  StoredKanaState,
} from '../model/types';
import { emptyInputs } from './session';

const EMPTY_STATE: StoredKanaState = {
  questionCount: null,
  selection: [],
  session: null,
};

export function readKanaState(
  script: KanaScript,
  userId: string | undefined,
): StoredKanaState {
  if (userId === undefined) return EMPTY_STATE;
  let raw: null | string;
  try {
    raw = window.sessionStorage.getItem(storageKey(script));
  } catch {
    return EMPTY_STATE;
  }
  return raw === null ? EMPTY_STATE : restoreKanaState(raw, script, userId);
}

export function restoreKanaState(
  raw: string,
  script: KanaScript,
  userId: string,
): StoredKanaState {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_STATE;
  }
  const current = storedKanaStateSchema.safeParse(json);
  const legacy = current.success
    ? undefined
    : legacyKanaStateSchema.safeParse(json);
  const record = current.success
    ? current.data
    : legacy?.success
      ? {
          ...legacy.data,
          session: legacy.data.session && upgradeSession(legacy.data.session),
        }
      : undefined;
  if (record?.userId !== userId) return EMPTY_STATE;

  const ids = new Map<string, KanaId>(
    getKanaCatalog(script).map(({ id }) => [id, id]),
  );
  return {
    questionCount: record.questionCount ?? null,
    selection: record.selection.flatMap((id) => ids.get(id) ?? []),
    session: record.session && restoreSession(record.session, script, ids),
  };
}

function restoreQuestion(
  stored: StoredKanaSession['order'][number],
  script: KanaScript,
  selection: readonly KanaId[],
  ids: ReadonlyMap<string, KanaId>,
): KanaQuestion | null {
  if (stored.direction === 'kana-to-romaji') {
    const kanaId = ids.get(stored.kanaId);
    return kanaId && selection.includes(kanaId)
      ? { direction: stored.direction, kanaId }
      : null;
  }
  const group = findReadingGroup(stored.readingId);
  return group?.script === script &&
    group.kana.some(({ id }) => selection.includes(id))
    ? { direction: stored.direction, readingId: group.id }
    : null;
}

function restoreResult(
  stored: StoredKanaSession['results'][number],
  question: KanaQuestion | undefined,
): KanaQuestionResult | null {
  const expected = question ? getExpectedKana(question) : [];
  if (expected.length === 0 || stored.length !== expected.length) return null;
  const skipped = stored.filter(({ outcome }) => outcome === 'skipped');
  if (skipped.length !== 0 && skipped.length !== stored.length) return null;

  const result: KanaAttempt[] = [];
  for (const [index, attempt] of stored.entries()) {
    const kanaId = expected[index]?.id;
    if (kanaId === undefined || attempt.kanaId !== kanaId) return null;
    if (attempt.answer.length > MAX_ANSWER_LENGTH) return null;
    if (attempt.corrected === true && attempt.outcome !== 'incorrect') {
      return null;
    }
    result.push({
      answer: attempt.answer,
      kanaId,
      outcome: attempt.outcome,
      ...(attempt.corrected === true && { corrected: true }),
      ...(attempt.hintUsed === true && { hintUsed: true }),
    });
  }
  return result;
}

function restoreSession(
  stored: StoredKanaSession,
  script: KanaScript,
  ids: ReadonlyMap<string, KanaId>,
): KanaPracticeSession | null {
  const selection = stored.selection.flatMap((id) => ids.get(id) ?? []);
  if (selection.length !== stored.selection.length) return null;
  if (new Set(selection).size !== selection.length) return null;

  const order = stored.order.flatMap((question) => {
    const restored = restoreQuestion(question, script, selection, ids);
    return restored &&
      (stored.mode === 'both' || stored.mode === restored.direction)
      ? [restored]
      : [];
  });
  if (order.length === 0 || order.length !== stored.order.length) return null;

  const { position } = stored;
  const answered = stored.results.length;
  if (position > order.length) return null;
  if (answered !== position && answered !== position + 1) return null;
  if (answered > order.length) return null;

  const results: KanaQuestionResult[] = [];
  for (const [index, result] of stored.results.entries()) {
    const restored = restoreResult(result, order[index]);
    if (!restored) return null;
    results.push(restored);
  }
  if (
    answered > position &&
    results.at(-1)?.some(({ outcome }) => outcome === 'skipped')
  ) {
    return null;
  }
  const inputs = emptyInputs(order[position]);
  if (position < order.length && stored.inputs.length !== inputs.length) {
    return null;
  }
  return {
    hintShown: stored.hintShown,
    hintUsed: stored.hintUsed || stored.hintShown,
    inputs: position < order.length ? stored.inputs : inputs,
    mode: stored.mode,
    order,
    position,
    questionCount: stored.questionCount,
    results,
    roundId: stored.roundId,
    selection,
  };
}

function storageKey(script: KanaScript): string {
  return `${KANA_STORAGE_PREFIX}${script}`;
}

function upgradeSession(legacy: LegacyKanaSession): StoredKanaSession {
  return {
    hintShown: legacy.hintShown === true,
    hintUsed: legacy.hintUsed === true,
    inputs: [legacy.input],
    mode: 'kana-to-romaji',
    order: legacy.order.map((kanaId) => ({
      direction: 'kana-to-romaji',
      kanaId,
    })),
    position: legacy.position,
    questionCount: legacy.questionCount ?? legacy.selection.length,
    results: legacy.attempts.map((attempt) => [attempt]),
    roundId: legacy.roundId ?? crypto.randomUUID(),
    selection: legacy.selection,
  };
}

export function writeKanaState(
  script: KanaScript,
  userId: string | undefined,
  patch: Partial<StoredKanaState>,
): void {
  if (userId === undefined) return;
  const record = {
    ...readKanaState(script, userId),
    ...patch,
    userId,
    version: KANA_STORAGE_VERSION,
  };
  try {
    window.sessionStorage.setItem(storageKey(script), JSON.stringify(record));
  } catch {
    return;
  }
}
