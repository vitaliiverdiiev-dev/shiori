import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../helpers/session';
import { readKanaState, writeKanaState } from '../../helpers/storage';
import type { KanaId, KanaPracticeSession } from '../../model/types';
import { KanaPractice } from '../kana-practice';

const keepOrder = () => 0.999;

function setup(
  session: KanaPracticeSession | null = createSession(
    ['hiragana:si', 'hiragana:kyu'],
    { random: keepOrder },
  ),
) {
  if (session) writeKanaState('hiragana', 'alice', { session });
  const user = userEvent.setup({
    advanceTimers: (ms) => {
      vi.advanceTimersByTime(ms);
    },
  });
  const view = render(
    <MemoryRouter initialEntries={['/kana/hiragana/practice']}>
      <Routes>
        <Route
          element={<KanaPractice script="hiragana" userId="alice" />}
          path="/kana/hiragana/practice"
        />
        <Route element={<h1>Selection</h1>} path="/kana/hiragana" />
      </Routes>
    </MemoryRouter>,
  );
  return { user, view };
}

const input = () => screen.getByRole('textbox');
const feedback = () => screen.getByRole('status');
const field = () => input().closest('[data-slot="input-group"]');
const hintButton = () =>
  screen.getByRole('button', { name: 'Show the reading' });
const stored = () => readKanaState('hiragana', 'alice').session;
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('KanaPractice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // WORKAROUND(@testing-library/react@16): its async wrapper only advances Jest fake timers; remove when it detects Vitest's.
    vi.stubGlobal('jest', {
      advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the question, its number and a labelled romaji field', () => {
    setup();

    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(input()).toHaveAccessibleName('し Reading in romaji');
    expect(input()).toHaveAttribute('autocapitalize', 'none');
    expect(input()).toHaveAttribute('autocomplete', 'off');
    expect(input()).toHaveAttribute('autocorrect', 'off');
    expect(input()).toHaveAttribute('spellcheck', 'false');
  });

  it('does not focus the field without a fine pointer', () => {
    setup();
    expect(input()).not.toHaveFocus();
  });

  it('focuses the field on mount when a fine pointer is available', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    setup();
    expect(input()).toHaveFocus();
  });

  it('marks a correct answer and moves on by itself after 400 ms', async () => {
    const { user } = setup();

    await user.click(input());
    await user.keyboard('SI{Enter}');
    expect(feedback()).toHaveTextContent('Correct: shi');
    expect(field()).toHaveAttribute('data-correct');
    expect(input()).toHaveValue('SI');
    expect(input()).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Next' }),
    ).not.toBeInTheDocument();

    wait(399);
    expect(screen.getByText('Question 1 of 2')).toBeVisible();

    wait(1);
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(field()).not.toHaveAttribute('data-correct');
    expect(feedback()).toBeEmptyDOMElement();
    expect(stored()?.attempts).toHaveLength(1);
  });

  it('says “Try again” after a wrong answer, without revealing the reading', async () => {
    const { user } = setup();

    await user.type(input(), 'chi{Enter}');
    expect(feedback()).toHaveTextContent(/^Try again$/);
    expect(feedback()).not.toHaveTextContent('shi');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).not.toHaveAttribute('data-correct');
    expect(input()).toHaveFocus();
    expect(input()).toHaveProperty('selectionStart', 0);
    expect(input()).toHaveProperty('selectionEnd', 3);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeVisible();

    wait(5000);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(stored()?.attempts).toHaveLength(1);
  });

  it('skips after a wrong answer without recording another attempt', async () => {
    const { user } = setup();

    await user.type(input(), 'chi{Enter}');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(stored()?.attempts).toEqual([
      { answer: 'chi', kanaId: 'hiragana:si', outcome: 'incorrect' },
    ]);
  });

  it('checks every retyped answer until it is right, then moves on after 400 ms', async () => {
    const { user } = setup();

    await user.type(input(), 'chi{Enter}');
    await user.keyboard('su{Enter}');
    expect(feedback()).toHaveTextContent('Try again');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Question 1 of 2')).toBeVisible();

    await user.keyboard('SHI{Enter}');
    expect(feedback()).toHaveTextContent('Correct: shi');
    expect(field()).toHaveAttribute('data-correct');
    expect(input()).not.toHaveAttribute('aria-invalid');
    await user.keyboard('{Enter}x');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(input()).toHaveValue('SHI');

    wait(400);
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(input()).toHaveValue('');
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(stored()?.attempts).toEqual([
      {
        answer: 'chi',
        corrected: true,
        kanaId: 'hiragana:si',
        outcome: 'incorrect',
      },
    ]);
  });

  it('reveals the reading on demand without touching the field', async () => {
    const { user } = setup();

    await user.type(input(), 'sh');
    expect(hintButton()).toHaveAttribute('aria-expanded', 'false');
    expect(feedback()).not.toHaveTextContent('shi');

    await user.click(hintButton());
    expect(hintButton()).toHaveAttribute('aria-expanded', 'true');
    expect(feedback()).toHaveTextContent('Reading: shi');
    expect(input()).toHaveValue('sh');
    expect(input()).toHaveFocus();
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(stored()?.attempts).toEqual([]);

    await user.keyboard('i{Enter}');
    expect(stored()?.attempts).toEqual([
      {
        answer: 'shi',
        hintUsed: true,
        kanaId: 'hiragana:si',
        outcome: 'correct',
      },
    ]);
    wait(400);
    expect(hintButton()).toHaveAttribute('aria-expanded', 'false');
    expect(feedback()).not.toHaveTextContent('Reading');
  });

  it('opens the hint from the keyboard and after a wrong answer', async () => {
    const { user } = setup();

    await user.type(input(), 'su{Enter}');
    await user.tab();
    expect(hintButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(feedback()).toHaveTextContent('Try again');
    expect(feedback()).toHaveTextContent('Reading: shi');
    expect(input()).toHaveFocus();
    expect(stored()?.attempts).toEqual([
      {
        answer: 'su',
        hintUsed: true,
        kanaId: 'hiragana:si',
        outcome: 'incorrect',
      },
    ]);
  });

  it('keeps an open hint after a reload', () => {
    setup({
      ...createSession(['hiragana:si', 'hiragana:kyu'], { random: keepOrder }),
      hintShown: true,
    });
    expect(feedback()).toHaveTextContent('Reading: shi');
    expect(hintButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('asks for a reading instead of submitting an empty answer', async () => {
    const { user } = setup();

    await user.type(input(), '   {Enter}');
    expect(feedback()).toHaveTextContent(
      'Type the reading first, or choose Skip.',
    );
    expect(screen.getByRole('button', { name: 'Check' })).toBeVisible();
    expect(readKanaState('hiragana', 'alice').session?.attempts).toEqual([]);
  });

  it('ignores extra Enter presses and typing while a correct answer is shown', async () => {
    const { user } = setup();

    await user.type(input(), 'shi{Enter}');
    expect(fireEvent.keyDown(input(), { key: 'Enter', repeat: true })).toBe(
      false,
    );
    await user.keyboard('{Enter}{Enter}ka');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(input()).toHaveValue('shi');

    wait(400);
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(stored()?.attempts).toHaveLength(1);
    expect(stored()?.position).toBe(1);
  });

  it('records one attempt for a wrong answer however often Enter is held', async () => {
    const { user } = setup();

    await user.type(input(), 'su{Enter}');
    expect(fireEvent.keyDown(input(), { key: 'Enter', repeat: true })).toBe(
      false,
    );
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(stored()?.attempts).toEqual([
      { answer: 'su', kanaId: 'hiragana:si', outcome: 'incorrect' },
    ]);
  });

  it('does not submit while an IME composition is open', async () => {
    const { user } = setup();

    await user.click(input());
    fireEvent.compositionStart(input());
    await user.keyboard('shi{Enter}');
    expect(screen.getByRole('button', { name: 'Check' })).toBeVisible();

    fireEvent.compositionEnd(input());
    await user.keyboard('{Enter}');
    expect(feedback()).toHaveTextContent('Correct: shi');
  });

  it('skips to the next question without feedback and keeps focus', async () => {
    const { user } = setup();

    await user.type(input(), 'sh');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(feedback()).toBeEmptyDOMElement();
  });

  it('summarizes the round and retries only the missed kana', async () => {
    const { user } = setup(
      createSession(['hiragana:a', 'hiragana:ka', 'hiragana:si'], {
        random: keepOrder,
      }),
    );

    await user.type(input(), 'a{Enter}');
    wait(400);
    await user.type(input(), 'ga{Enter}');
    await user.keyboard('ka{Enter}');
    wait(400);
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    const heading = screen.getByRole('heading', { name: 'Round complete' });
    expect(heading).toHaveFocus();
    const value = (term: string) =>
      screen.getByText(term).nextElementSibling?.textContent;
    expect(value('Questions')).toBe('3');
    expect(value('Correct')).toBe('1');
    expect(value('With hint')).toBe('0');
    expect(value('Incorrect')).toBe('1');
    expect(value('Skipped')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Retry 2 missed' }));
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(input()).toHaveFocus();
    const retry = stored();
    expect([...(retry?.order ?? [])].sort()).toEqual([
      'hiragana:ka',
      'hiragana:si',
    ]);
    expect(retry?.selection).toHaveLength(3);
  });

  it('shows the summary 400 ms after a correct last answer, without retry', async () => {
    const ids: KanaId[] = ['hiragana:a'];
    const { user } = setup(createSession(ids));

    await user.type(input(), 'a{Enter}');
    wait(399);
    expect(
      screen.queryByRole('heading', { name: 'Round complete' }),
    ).not.toBeInTheDocument();
    wait(1);
    expect(
      screen.getByRole('heading', { name: 'Round complete' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Retry/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('To review')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Practice the same selection again' }),
    );
    expect(screen.getByText('Question 1 of 1')).toBeVisible();
  });

  it('practises the same selection again with its question count', async () => {
    const { user } = setup(
      createSession(['hiragana:a'], { questionCount: 3, random: keepOrder }),
    );

    for (let question = 0; question < 3; question += 1) {
      await user.type(input(), 'a{Enter}');
      wait(400);
    }
    expect(
      screen.getByRole('heading', { name: 'Round complete' }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Practice the same selection again' }),
    );
    expect(screen.getByText('Question 1 of 3')).toBeVisible();
  });

  it('records repeated kana as separate questions', async () => {
    const { user } = setup(
      createSession(['hiragana:a', 'hiragana:i'], {
        questionCount: 4,
        random: keepOrder,
      }),
    );
    const prompts: (null | string)[] = [];
    for (let question = 0; question < 4; question += 1) {
      prompts.push(screen.getByText(/^[あい]$/).textContent);
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    }

    expect([...prompts].sort()).toEqual(['あ', 'あ', 'い', 'い']);
    expect(
      screen.getByRole('heading', { name: 'Round complete' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Retry 2 missed' }),
    ).toBeVisible();
  });

  it('cancels the pending advance when practice unmounts', async () => {
    const { user, view } = setup();

    await user.type(input(), 'shi{Enter}');
    view.unmount();
    wait(400);
    expect(stored()).toMatchObject({ position: 0 });
    expect(stored()?.attempts).toHaveLength(1);
  });

  it('finishes a restored correct answer once, without recording it again', () => {
    const round = createSession(['hiragana:si', 'hiragana:kyu'], {
      random: keepOrder,
    });
    setup({
      ...round,
      attempts: [{ answer: 'shi', kanaId: 'hiragana:si', outcome: 'correct' }],
    });

    expect(field()).toHaveAttribute('data-correct');
    expect(feedback()).toHaveTextContent('Correct: shi');
    wait(400);
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(stored()?.attempts).toHaveLength(1);
  });

  it('returns to the selection when there is no round to resume', () => {
    setup(null);
    expect(screen.getByRole('heading', { name: 'Selection' })).toBeVisible();
  });

  it('leaves the round resumable', async () => {
    const { user } = setup();

    await user.type(input(), 'sh');
    await user.click(screen.getByRole('link', { name: 'Leave' }));
    expect(screen.getByRole('heading', { name: 'Selection' })).toBeVisible();
    expect(readKanaState('hiragana', 'alice').session?.input).toBe('sh');
  });
});
