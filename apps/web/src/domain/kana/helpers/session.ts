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

export function createRetrySession(
  session: KanaPracticeSession,
  random: () => number = Math.random,
): KanaPracticeSession {
  return {
    ...createSession(summarizeSession(session).missed, random),
    selection: session.selection,
  };
}

export function createSession(
  kanaIds: readonly KanaId[],
  random: () => number = Math.random,
): KanaPracticeSession {
  return {
    attempts: [],
    input: '',
    order: shuffle([...new Set(kanaIds)], random),
    position: 0,
    selection: [...new Set(kanaIds)],
  };
}

export function getPracticePhase(
  session: KanaPracticeSession,
): KanaPracticePhase {
  if (session.position >= session.order.length) return 'complete';
  return session.attempts.length > session.position ? 'feedback' : 'answering';
}

export function practiceReducer(
  session: KanaPracticeSession | null,
  action: KanaPracticeAction,
): KanaPracticeSession | null {
  if (action.type === 'start') return action.session;
  if (!session) return session;
  const phase = getPracticePhase(session);
  const kanaId = session.order[session.position];

  switch (action.type) {
    case 'input':
      return phase === 'answering'
        ? { ...session, input: action.value }
        : session;
    case 'next':
      return phase === 'feedback'
        ? { ...session, input: '', position: session.position + 1 }
        : session;
    case 'skip':
      if (phase !== 'answering' || kanaId === undefined) return session;
      return {
        ...session,
        attempts: [
          ...session.attempts,
          { answer: '', kanaId, outcome: 'skipped' },
        ],
        input: '',
        position: session.position + 1,
      };
    case 'submit': {
      const answer = session.input.trim();
      if (phase !== 'answering' || kanaId === undefined || answer === '') {
        return session;
      }
      const kana = findKana(kanaId);
      const attempt: KanaAttempt = {
        answer,
        kanaId,
        outcome:
          kana && isAcceptedReading(kana, answer) ? 'correct' : 'incorrect',
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
  const count = (outcome: KanaAttempt['outcome']) =>
    session.attempts.filter((attempt) => attempt.outcome === outcome).length;
  return {
    correct: count('correct'),
    incorrect: count('incorrect'),
    missed: [
      ...new Set(
        session.attempts
          .filter(({ outcome }) => outcome !== 'correct')
          .map(({ kanaId }) => kanaId),
      ),
    ],
    skipped: count('skipped'),
    total: session.order.length,
  };
}
