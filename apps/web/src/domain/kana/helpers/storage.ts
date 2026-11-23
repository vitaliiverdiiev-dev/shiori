import { KANA_STORAGE_PREFIX, KANA_STORAGE_VERSION } from '../model/consts';
import { type StoredKanaRecord, storedKanaStateSchema } from '../model/schema';
import type {
  KanaAttempt,
  KanaId,
  KanaPracticeSession,
  KanaScript,
  StoredKanaState,
} from '../model/types';
import { getKanaCatalog } from './catalog';

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
  const parsed = storedKanaStateSchema.safeParse(json);
  if (!parsed.success || parsed.data.userId !== userId) return EMPTY_STATE;

  const ids = new Map<string, KanaId>(
    getKanaCatalog(script).map(({ id }) => [id, id]),
  );
  return {
    questionCount: parsed.data.questionCount ?? null,
    selection: parsed.data.selection.flatMap((id) => ids.get(id) ?? []),
    session: parsed.data.session && restoreSession(parsed.data.session, ids),
  };
}

function restoreSession(
  stored: NonNullable<StoredKanaRecord['session']>,
  ids: ReadonlyMap<string, KanaId>,
): KanaPracticeSession | null {
  const selection = toKanaIds(stored.selection, ids);
  const order = toKanaIds(stored.order, ids);
  if (!selection || !order || order.length === 0) return null;
  if (new Set(selection).size !== selection.length) return null;
  if (!order.every((id) => selection.includes(id))) return null;

  const { position } = stored;
  const answered = stored.attempts.length;
  if (position > order.length) return null;
  if (answered !== position && answered !== position + 1) return null;
  if (answered > order.length) return null;

  const attempts: KanaAttempt[] = [];
  for (const [index, attempt] of stored.attempts.entries()) {
    const kanaId = order[index];
    if (kanaId === undefined || attempt.kanaId !== kanaId) return null;
    if (attempt.corrected === true && attempt.outcome !== 'incorrect') {
      return null;
    }
    attempts.push({
      answer: attempt.answer,
      kanaId,
      outcome: attempt.outcome,
      ...(attempt.corrected === true && { corrected: true }),
      ...(attempt.hintUsed === true && { hintUsed: true }),
    });
  }
  if (answered > position && attempts.at(-1)?.outcome === 'skipped') {
    return null;
  }
  return {
    attempts,
    hintShown: stored.hintShown === true,
    hintUsed: stored.hintUsed === true || stored.hintShown === true,
    input: stored.input,
    order,
    position,
    questionCount: stored.questionCount ?? selection.length,
    selection,
  };
}

function storageKey(script: KanaScript): string {
  return `${KANA_STORAGE_PREFIX}${script}`;
}

function toKanaIds(
  values: readonly string[],
  ids: ReadonlyMap<string, KanaId>,
): KanaId[] | null {
  const result = values.flatMap((value) => ids.get(value) ?? []);
  return result.length === values.length ? result : null;
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
