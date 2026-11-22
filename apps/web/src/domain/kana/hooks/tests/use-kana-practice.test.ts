import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../helpers/session';
import { writeKanaState } from '../../helpers/storage';
import type { KanaPracticeSession } from '../../model/types';
import { useKanaPractice } from '../use-kana-practice';

const keepOrder = () => 0.999;
const awaitingCorrect = (ids: KanaPracticeSession['order']) => {
  const round = createSession(ids, keepOrder);
  const first = round.order[0] ?? 'hiragana:a';
  return {
    ...round,
    attempts: [{ answer: 'x', kanaId: first, outcome: 'correct' as const }],
  };
};

describe('useKanaPractice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not let the old round’s timer advance a newly started round', () => {
    writeKanaState('hiragana', 'alice', {
      session: awaitingCorrect(['hiragana:a', 'hiragana:i']),
    });
    const { result } = renderHook(() => useKanaPractice('hiragana', 'alice'));
    expect(result.current.awaitingAdvance).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
      result.current.dispatch({
        session: createSession(['hiragana:u', 'hiragana:e'], keepOrder),
        type: 'start',
      });
      vi.advanceTimersByTime(400);
    });
    expect(result.current.session?.position).toBe(0);
    expect(result.current.session?.attempts).toEqual([]);
  });

  it('restarts the delay for a new round that is itself awaiting advance', () => {
    writeKanaState('hiragana', 'alice', {
      session: awaitingCorrect(['hiragana:a', 'hiragana:i']),
    });
    const { result } = renderHook(() => useKanaPractice('hiragana', 'alice'));

    act(() => {
      vi.advanceTimersByTime(300);
      result.current.dispatch({
        session: awaitingCorrect(['hiragana:u', 'hiragana:e']),
        type: 'start',
      });
      vi.advanceTimersByTime(100);
    });
    expect(result.current.session?.order[0]).toBe('hiragana:u');
    expect(result.current.session?.position).toBe(0);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current.session?.position).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.session?.position).toBe(1);
    expect(result.current.session?.attempts).toHaveLength(1);
  });
});
