import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createSession } from '../../helpers/session';
import { readKanaState, writeKanaState } from '../../helpers/storage';
import type { KanaId, KanaPracticeSession } from '../../model/types';
import { PracticeLauncher } from '../practice-launcher';

function setup(selectedIds: readonly KanaId[]) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/kana/hiragana']}>
      <Routes>
        <Route
          element={
            <PracticeLauncher
              script="hiragana"
              selectedIds={selectedIds}
              userId="alice"
            />
          }
          path="/kana/hiragana"
        />
        <Route element={<h1>Practice</h1>} path="/kana/hiragana/practice" />
      </Routes>
    </MemoryRouter>,
  );
  return { user };
}

describe('PracticeLauncher', () => {
  it('cannot start a round without a selection', () => {
    setup([]);
    expect(
      screen.getByRole('button', { name: 'Start practice' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('starts a new round with the selected kana', async () => {
    const { user } = setup(['hiragana:a', 'hiragana:ka']);

    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeVisible();
    const session = readKanaState('hiragana', 'alice').session;
    expect([...(session?.order ?? [])].sort()).toEqual([
      'hiragana:a',
      'hiragana:ka',
    ]);
  });

  it('offers to resume an unfinished round or start a new one explicitly', async () => {
    const round = createSession(['hiragana:a', 'hiragana:ka', 'hiragana:si']);
    const unfinished: KanaPracticeSession = {
      ...round,
      attempts: [
        {
          answer: '',
          kanaId: round.order[0] ?? 'hiragana:a',
          outcome: 'skipped',
        },
      ],
      position: 1,
    };
    writeKanaState('hiragana', 'alice', { session: unfinished });
    const { user } = setup(['hiragana:ki']);

    expect(
      screen.getByRole('link', { name: 'Resume practice 2/3' }),
    ).toHaveAttribute('href', '/kana/hiragana/practice');
    await user.click(screen.getByRole('button', { name: 'Start new round' }));
    expect(readKanaState('hiragana', 'alice').session?.order).toEqual([
      'hiragana:ki',
    ]);
  });
});
