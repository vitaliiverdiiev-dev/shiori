import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createSession } from '../../helpers/session';
import { readKanaState, writeKanaState } from '../../helpers/storage';
import type { KanaId, KanaPracticeSession } from '../../model/types';
import { KanaPractice } from '../kana-practice';

const keepOrder = () => 0.999;

function setup(
  session: KanaPracticeSession | null = createSession(
    ['hiragana:si', 'hiragana:kyu'],
    keepOrder,
  ),
) {
  if (session) writeKanaState('hiragana', 'alice', { session });
  const user = userEvent.setup();
  render(
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
  return { user };
}

const input = () => screen.getByRole('textbox');
const feedback = () => screen.getByRole('status');

describe('KanaPractice', () => {
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

  it('submits with Enter, shows feedback, then advances with Enter', async () => {
    const { user } = setup();

    await user.click(input());
    await user.keyboard('SI{Enter}');
    expect(feedback()).toHaveTextContent('Correct: shi');
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('SI');

    await user.keyboard('{Enter}');
    expect(screen.getByText('Question 2 of 2')).toBeVisible();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(feedback()).toBeEmptyDOMElement();
  });

  it('shows the correct reading and the given answer when wrong', async () => {
    const { user } = setup();

    await user.type(input(), 'chi{Enter}');
    expect(feedback()).toHaveTextContent(
      'Incorrect. し is shi; you answered “chi”.',
    );
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Next' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Skip' }),
    ).not.toBeInTheDocument();
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

  it('records one attempt however often Enter is pressed during feedback', async () => {
    const { user } = setup();

    await user.type(input(), 'shi{Enter}');
    expect(fireEvent.keyDown(input(), { key: 'Enter', repeat: true })).toBe(
      false,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(readKanaState('hiragana', 'alice').session?.attempts).toHaveLength(
      1,
    );
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
      createSession(['hiragana:a', 'hiragana:ka', 'hiragana:si'], keepOrder),
    );

    await user.type(input(), 'a{Enter}{Enter}');
    await user.type(input(), 'ga{Enter}{Enter}');
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    const heading = screen.getByRole('heading', { name: 'Round complete' });
    expect(heading).toHaveFocus();
    const value = (term: string) =>
      screen.getByText(term).nextElementSibling?.textContent;
    expect(value('Questions')).toBe('3');
    expect(value('Correct')).toBe('1');
    expect(value('Incorrect')).toBe('1');
    expect(value('Skipped')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Retry 2 missed' }));
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
    expect(input()).toHaveFocus();
    const retry = readKanaState('hiragana', 'alice').session;
    expect([...(retry?.order ?? [])].sort()).toEqual([
      'hiragana:ka',
      'hiragana:si',
    ]);
    expect(retry?.selection).toHaveLength(3);
  });

  it('offers no retry after a perfect round and restarts the full selection', async () => {
    const ids: KanaId[] = ['hiragana:a'];
    const { user } = setup(createSession(ids));

    await user.type(input(), 'a{Enter}{Enter}');
    expect(
      screen.queryByRole('button', { name: /Retry/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('To review')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Practice the same selection again' }),
    );
    expect(screen.getByText('Question 1 of 1')).toBeVisible();
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
