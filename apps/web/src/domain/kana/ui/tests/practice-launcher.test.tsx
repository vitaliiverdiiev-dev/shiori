import type { KanaId } from '@shiori/kana';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createSession } from '../../helpers/session';
import { readKanaState, writeKanaState } from '../../helpers/storage';
import type { KanaPracticeSession } from '../../model/types';
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

  it('defaults the question count to the selection and describes it', () => {
    setup(['hiragana:a', 'hiragana:ka']);
    const count = screen.getByRole('spinbutton', { name: 'Questions' });
    expect(count).toHaveValue(2);
    expect(count).toHaveAccessibleDescription('2 questions · each kana once');
  });

  it('starts a round with the configured number of questions and keeps it', async () => {
    const ids: KanaId[] = Array.from(
      ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'],
      (id) => `hiragana:${id}` as const,
    );
    const { user } = setup(ids);
    const count = screen.getByRole('spinbutton', { name: 'Questions' });

    await user.clear(count);
    await user.type(count, '23');
    expect(count).toHaveAccessibleDescription(
      '23 questions · each kana 2–3 times',
    );
    expect(readKanaState('hiragana', 'alice').questionCount).toBe(23);

    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    const session = readKanaState('hiragana', 'alice').session;
    expect(session?.order).toHaveLength(23);
    expect(session?.questionCount).toBe(23);
  });

  it('refuses an invalid question count', async () => {
    const { user } = setup(['hiragana:a']);
    const count = screen.getByRole('spinbutton', { name: 'Questions' });

    await user.clear(count);
    await user.type(count, '0');
    expect(readKanaState('hiragana', 'alice').questionCount).toBeNull();

    for (const text of ['0', '1001']) {
      await user.clear(count);
      await user.type(count, text);
      expect(count).toHaveAttribute('aria-invalid', 'true');
      expect(count).toHaveAccessibleDescription(
        'Enter a whole number from 1 to 1,000.',
      );
      expect(
        screen.getByRole('button', { name: 'Start practice' }),
      ).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('restores the configured count without changing an unfinished round', () => {
    const round = createSession(['hiragana:a'], { questionCount: 5 });
    writeKanaState('hiragana', 'alice', { questionCount: 40, session: round });
    setup(['hiragana:a', 'hiragana:ka']);

    expect(screen.getByRole('spinbutton', { name: 'Questions' })).toHaveValue(
      40,
    );
    expect(
      screen.getByRole('link', { name: 'Resume practice 1/5' }),
    ).toBeVisible();
    expect(readKanaState('hiragana', 'alice').session).toEqual(round);
  });
});
