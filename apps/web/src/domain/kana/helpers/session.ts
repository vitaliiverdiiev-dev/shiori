import type {
  KanaAttempt,
  KanaId,
  KanaPracticeAction,
  KanaPracticePhase,
  KanaPracticeSession,
  KanaPracticeSummary,
} from '../model/types';
import { isAcceptedReading } from './answer';
import { findKana } from './catalog';

export function buildQuestionOrder(
  kanaIds: readonly KanaId[],
  questionCount: number,
  random: () => number = Math.random,
): KanaId[] {
  const unique = [...new Set(kanaIds)];
  const order: KanaId[] = [];
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

export function createRetrySession(
  session: KanaPracticeSession,
  random: () => number = Math.random,
): KanaPracticeSession {
  return {
    ...createSession(summarizeSession(session).missed, { random }),
    questionCount: session.questionCount,
    selection: session.selection,
  };
}

export function createSession(
  kanaIds: readonly KanaId[],
  {
    questionCount,
    random = Math.random,
  }: { questionCount?: number; random?: () => number } = {},
): KanaPracticeSession {
  const selection = [...new Set(kanaIds)];
  const count = questionCount ?? selection.length;
  return {
    attempts: [],
    hintShown: false,
    hintUsed: false,
    input: '',
    order: buildQuestionOrder(selection, count, random),
    position: 0,
    questionCount: count,
    selection,
  };
}

export function getPracticePhase(
  session: KanaPracticeSession,
): KanaPracticePhase {
  if (session.position >= session.order.length) return 'complete';
  return session.attempts.length > session.position ? 'feedback' : 'answering';
}

export function isAwaitingAdvance(session: KanaPracticeSession): boolean {
  const attempt = session.attempts[session.position];
  return (
    getPracticePhase(session) === 'feedback' &&
    (attempt?.outcome === 'correct' || attempt?.corrected === true)
  );
}

export function isAwaitingCorrection(session: KanaPracticeSession): boolean {
  const attempt = session.attempts[session.position];
  return (
    getPracticePhase(session) === 'feedback' &&
    attempt?.outcome === 'incorrect' &&
    attempt.corrected !== true
  );
}

export function practiceReducer(
  session: KanaPracticeSession | null,
  action: KanaPracticeAction,
): KanaPracticeSession | null {
  if (action.type === 'start') return action.session;
  if (!session) return session;
  const answering = getPracticePhase(session) === 'answering';
  const correcting = isAwaitingCorrection(session);
  const kanaId = session.order[session.position];
  const advanced = {
    ...session,
    hintShown: false,
    hintUsed: false,
    input: '',
    position: session.position + 1,
  };

  switch (action.type) {
    case 'hint':
      if (!answering && !correcting) return session;
      if (session.hintShown) return { ...session, hintShown: false };
      return {
        ...session,
        attempts: correcting
          ? updateCurrentAttempt(session, { hintUsed: true })
          : session.attempts,
        hintShown: true,
        hintUsed: true,
      };
    case 'input':
      return answering || correcting
        ? { ...session, input: action.value }
        : session;
    case 'next':
      return isAwaitingAdvance(session) && (action.from ?? session) === session
        ? advanced
        : session;
    case 'skip':
      if (correcting) return advanced;
      if (!answering || kanaId === undefined) return session;
      return {
        ...advanced,
        attempts: [
          ...session.attempts,
          {
            answer: '',
            kanaId,
            outcome: 'skipped',
            ...(session.hintUsed && { hintUsed: true }),
          },
        ],
      };
    case 'submit': {
      const answer = session.input.trim();
      if (kanaId === undefined || answer === '') return session;
      const kana = findKana(kanaId);
      const accepted = kana !== undefined && isAcceptedReading(kana, answer);
      if (correcting) {
        return accepted
          ? {
              ...session,
              attempts: updateCurrentAttempt(session, { corrected: true }),
            }
          : session;
      }
      if (!answering) return session;
      const attempt: KanaAttempt = {
        answer,
        kanaId,
        outcome: accepted ? 'correct' : 'incorrect',
        ...(session.hintUsed && { hintUsed: true }),
      };
      return { ...session, attempts: [...session.attempts, attempt] };
    }
  }
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

export function summarizeSession(
  session: KanaPracticeSession,
): KanaPracticeSummary {
  const { attempts } = session;
  const count = (matches: (attempt: KanaAttempt) => boolean) =>
    attempts.filter(matches).length;
  return {
    assisted: count((a) => a.outcome === 'correct' && a.hintUsed === true),
    correct: count((a) => a.outcome === 'correct' && a.hintUsed !== true),
    incorrect: count((a) => a.outcome === 'incorrect'),
    missed: [
      ...new Set(
        attempts
          .filter((a) => a.outcome !== 'correct' || a.hintUsed === true)
          .map(({ kanaId }) => kanaId),
      ),
    ],
    skipped: count((a) => a.outcome === 'skipped'),
    total: session.order.length,
  };
}

function updateCurrentAttempt(
  session: KanaPracticeSession,
  patch: Pick<KanaAttempt, 'corrected' | 'hintUsed'>,
): KanaAttempt[] {
  return session.attempts.map((attempt, index) =>
    index === session.position ? { ...attempt, ...patch } : attempt,
  );
}
