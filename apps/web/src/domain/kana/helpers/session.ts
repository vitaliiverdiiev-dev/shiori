import type { KanaId, KanaPracticeMode, KanaQuestion } from '@shiori/kana';
import {
  getExpectedKana,
  isAcceptedReading,
  matchKanaAnswers,
  planQuestions,
  toQuestionUnits,
} from '@shiori/kana';
import { MAX_ANSWER_LENGTH } from '../model/consts';
import type {
  KanaAttempt,
  KanaPracticeAction,
  KanaPracticePhase,
  KanaPracticeSession,
  KanaPracticeSummary,
  KanaQuestionResult,
  PendingKanaAttempt,
} from '../model/types';

type Evaluation = { answer: string; correct: boolean; kanaId: KanaId };

function attemptKey({ kanaId, questionIndex }: PendingKanaAttempt): string {
  return `${String(questionIndex)}#${kanaId}`;
}

export function createRetrySession(
  session: KanaPracticeSession,
  random: () => number = Math.random,
): KanaPracticeSession {
  return {
    ...createSession(summarizeSession(session).missed, {
      mode: session.mode,
      random,
    }),
    questionCount: session.questionCount,
    selection: session.selection,
  };
}

export function createSession(
  kanaIds: readonly KanaId[],
  {
    mode = 'kana-to-romaji',
    questionCount,
    random = Math.random,
    roundId = crypto.randomUUID(),
  }: {
    mode?: KanaPracticeMode;
    questionCount?: number;
    random?: () => number;
    roundId?: string;
  } = {},
): KanaPracticeSession {
  const selection = [...new Set(kanaIds)];
  const units = toQuestionUnits(selection, mode);
  const count = questionCount ?? units.length;
  const order = planQuestions(units, count, random);
  return {
    hintShown: false,
    hintUsed: false,
    inputs: emptyInputs(order[0]),
    mode,
    order,
    position: 0,
    questionCount: count,
    results: [],
    roundId,
    selection,
  };
}

function currentResult(session: KanaPracticeSession): KanaQuestionResult {
  return session.results[session.position] ?? [];
}

export function emptyInputs(question: KanaQuestion | undefined): string[] {
  return question ? getExpectedKana(question).map(() => '') : [];
}

function evaluate(
  question: KanaQuestion,
  answers: readonly string[],
): Evaluation[] {
  const expected = getExpectedKana(question);
  if (question.direction === 'romaji-to-kana') {
    return matchKanaAnswers(expected, answers).map(
      ({ answer, correct, kana }) => ({ answer, correct, kanaId: kana.id }),
    );
  }
  return expected.map((kana, index) => {
    const answer = answers[index] ?? '';
    return {
      answer,
      correct: isAcceptedReading(kana, answer),
      kanaId: kana.id,
    };
  });
}

function finalizedAttempts(
  session: KanaPracticeSession,
  from: number,
): PendingKanaAttempt[] {
  const feedback = getPracticePhase(session) === 'feedback';
  return session.results.slice(from).flatMap((result, offset) => {
    const questionIndex = from + offset;
    const question = session.order[questionIndex];
    if (!question) return [];
    const current = questionIndex === session.position;
    if (current && !feedback) return [];
    return result
      .filter((attempt) => !current || isResolved(attempt))
      .map((attempt) =>
        toPendingAttempt(attempt, question, questionIndex, session.roundId),
      );
  });
}

export function getAbandonedAttempts(
  session: KanaPracticeSession,
): PendingKanaAttempt[] {
  const question = session.order[session.position];
  if (!question || !isAwaitingCorrection(session)) return [];
  return currentResult(session)
    .filter((attempt) => !isResolved(attempt))
    .map((attempt) =>
      toPendingAttempt(attempt, question, session.position, session.roundId),
    );
}

export function getFinalizedAttempts(
  previous: KanaPracticeSession | null,
  next: KanaPracticeSession,
): PendingKanaAttempt[] {
  if (previous?.roundId !== next.roundId) return [];
  const from = previous.position;
  const known = new Set(finalizedAttempts(previous, from).map(attemptKey));
  return finalizedAttempts(next, from).filter(
    (attempt) => !known.has(attemptKey(attempt)),
  );
}

export function getPracticePhase(
  session: KanaPracticeSession,
): KanaPracticePhase {
  if (session.position >= session.order.length) return 'complete';
  return session.results.length > session.position ? 'feedback' : 'answering';
}

export function isAwaitingAdvance(session: KanaPracticeSession): boolean {
  const result = currentResult(session);
  return (
    getPracticePhase(session) === 'feedback' &&
    result.length > 0 &&
    result.every(isResolved)
  );
}

export function isAwaitingCorrection(session: KanaPracticeSession): boolean {
  return (
    getPracticePhase(session) === 'feedback' &&
    currentResult(session).some((attempt) => !isResolved(attempt))
  );
}

function isResolved(attempt: KanaAttempt): boolean {
  return attempt.outcome !== 'incorrect' || attempt.corrected === true;
}

export function practiceReducer(
  session: KanaPracticeSession | null,
  action: KanaPracticeAction,
): KanaPracticeSession | null {
  if (action.type === 'start') return action.session;
  if (!session) return session;
  const answering = getPracticePhase(session) === 'answering';
  const correcting = isAwaitingCorrection(session);
  const question = session.order[session.position];
  const advanced = {
    ...session,
    hintShown: false,
    hintUsed: false,
    inputs: emptyInputs(session.order[session.position + 1]),
    position: session.position + 1,
  };

  switch (action.type) {
    case 'hint':
      if (!answering && !correcting) return session;
      if (session.hintShown) return { ...session, hintShown: false };
      return {
        ...session,
        hintShown: true,
        hintUsed: true,
        results: correcting
          ? updateCurrentResult(session, (attempt) =>
              isResolved(attempt) ? attempt : { ...attempt, hintUsed: true },
            )
          : session.results,
      };
    case 'input': {
      const field = action.field ?? 0;
      if ((!answering && !correcting) || field >= session.inputs.length) {
        return session;
      }
      return {
        ...session,
        inputs: session.inputs.map((value, index) =>
          index === field ? action.value : value,
        ),
      };
    }
    case 'next':
      return isAwaitingAdvance(session) && (action.from ?? session) === session
        ? advanced
        : session;
    case 'skip':
      if (correcting) return advanced;
      if (!answering || !question) return session;
      return {
        ...advanced,
        results: [
          ...session.results,
          getExpectedKana(question).map(({ id }): KanaAttempt => ({
            answer: '',
            kanaId: id,
            outcome: 'skipped',
            ...(session.hintUsed && { hintUsed: true }),
          })),
        ],
      };
    case 'submit': {
      const answers = session.inputs.map((value) => value.trim());
      if (
        !question ||
        answers.length !== getExpectedKana(question).length ||
        answers.some(
          (answer) => answer === '' || answer.length > MAX_ANSWER_LENGTH,
        )
      ) {
        return session;
      }
      const evaluation = evaluate(question, answers);
      if (correcting) {
        const matched = new Set(
          evaluation
            .filter(({ correct }) => correct)
            .map(({ kanaId }) => kanaId),
        );
        const fixes = currentResult(session).some(
          (attempt) => !isResolved(attempt) && matched.has(attempt.kanaId),
        );
        return fixes
          ? {
              ...session,
              results: updateCurrentResult(session, (attempt) =>
                !isResolved(attempt) && matched.has(attempt.kanaId)
                  ? { ...attempt, corrected: true }
                  : attempt,
              ),
            }
          : session;
      }
      if (!answering) return session;
      const result = evaluation.map(
        ({ answer, correct, kanaId }): KanaAttempt => ({
          answer,
          kanaId,
          outcome: correct ? 'correct' : 'incorrect',
          ...(session.hintUsed && { hintUsed: true }),
        }),
      );
      return { ...session, results: [...session.results, result] };
    }
  }
}

export function summarizeSession(
  session: KanaPracticeSession,
): KanaPracticeSummary {
  const attempts = session.results.flat();
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

function toPendingAttempt(
  attempt: KanaAttempt,
  question: KanaQuestion,
  questionIndex: number,
  roundId: string,
): PendingKanaAttempt {
  return {
    answer: attempt.answer,
    corrected: attempt.corrected === true,
    direction: question.direction,
    hintUsed: attempt.hintUsed === true,
    kanaId: attempt.kanaId,
    outcome: attempt.outcome,
    questionIndex,
    roundId,
  };
}

function updateCurrentResult(
  session: KanaPracticeSession,
  update: (attempt: KanaAttempt) => KanaAttempt,
): KanaQuestionResult[] {
  return session.results.map((result, index) =>
    index === session.position ? result.map(update) : result,
  );
}
