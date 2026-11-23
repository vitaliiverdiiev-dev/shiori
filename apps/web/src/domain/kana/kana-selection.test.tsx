import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { readPendingAttempts } from './helpers/pending-attempts';
import { createSession, practiceReducer } from './helpers/session';
import { readKanaState, writeKanaState } from './helpers/storage';
import { KanaSelection } from './kana-selection';
import type {
  KanaPracticeAction,
  KanaPracticeSession,
  KanaProgressStats,
  PendingKanaAttempt,
} from './model/types';

const PROGRESS = '*/api/kana-progress';
const ATTEMPTS = '*/api/kana-progress/attempts';
const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';

function pendingAttempt(questionIndex: number): PendingKanaAttempt {
  return {
    answer: 'shi',
    corrected: false,
    direction: 'kana-to-romaji',
    hintUsed: false,
    kanaId: 'hiragana:si',
    outcome: 'correct',
    questionIndex,
    roundId: ROUND,
  };
}

function play(
  session: KanaPracticeSession,
  ...actions: KanaPracticeAction[]
): KanaPracticeSession {
  return actions.reduce((current, action) => {
    const next = practiceReducer(current, action);
    if (!next) throw new Error('Expected a session');
    return next;
  }, session);
}

function progressResponse(kana: KanaProgressStats[] = []) {
  return http.get(PROGRESS, ({ request }) =>
    HttpResponse.json({
      direction: 'kana-to-romaji',
      kana,
      script: new URL(request.url).searchParams.get('script'),
    }),
  );
}

function recordAttempts(respond: () => Response) {
  const attempts: PendingKanaAttempt[] = [];
  server.use(
    http.post(ATTEMPTS, async ({ request }) => {
      const body = (await request.json()) as {
        attempts: PendingKanaAttempt[];
      };
      attempts.push(...body.attempts);
      return respond();
    }),
  );
  return attempts;
}

function setup(script: 'hiragana' | 'katakana' = 'hiragana') {
  const user = userEvent.setup();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <KanaSelection script={script} userId="alice" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, user };
}

function stats(
  kanaId: string,
  patch: Partial<KanaProgressStats> = {},
): KanaProgressStats {
  return {
    assistedCorrect: 0,
    attempts: 4,
    corrected: 0,
    incorrect: 0,
    independentCorrect: 4,
    kanaId,
    lastPracticedAt: '2026-11-20T10:00:00.000Z',
    skipped: 0,
    ...patch,
  };
}

const status = () => {
  const [selectionStatus] = screen.getAllByRole('status');
  if (!selectionStatus) throw new Error('Missing selection status');
  return selectionStatus;
};
const tab = (name: string) => screen.getByRole('tab', { name });
const statisticsStatus = () =>
  within(screen.getByRole('tabpanel', { name: 'Statistics' })).getByRole(
    'status',
  );
const openStatistics = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(tab('Statistics'));
};
const kana = (name: string) => screen.getByRole('button', { name });
const rowCheckbox = (label: string) =>
  screen.getByRole('checkbox', { name: `${label} row` });
const sectionCheckbox = (title: string) =>
  screen.getByRole('checkbox', { name: `Select all ${title}` });

describe('KanaSelection', () => {
  beforeEach(() => {
    server.use(progressResponse());
  });

  it('starts with nothing selected and shows every section', () => {
    setup();

    expect(status()).toHaveTextContent('0 selected');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Basic', 'Dakuten & handakuten', 'Yōon']);
    expect(tab('Practice')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Statistics')).toHaveAttribute('aria-selected', 'false');
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects and deselects single characters independently', async () => {
    const { user } = setup();

    await user.click(kana('し shi'));
    await user.click(kana('ち chi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('2 selected');

    await user.click(kana('し shi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
    expect(kana('ち chi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('1 selected');
  });

  it('shows a partly selected row as mixed and completes it on click', async () => {
    const { user } = setup();

    await user.click(kana('か ka'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'mixed');

    await user.click(rowCheckbox('か'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'true');
    const row = screen.getByRole('group', { name: 'か row' });
    for (const button of within(row).getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    expect(status()).toHaveTextContent('5 selected');

    await user.click(rowCheckbox('か'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'false');
    expect(status()).toHaveTextContent('0 selected');
  });

  it('selects a whole section and marks it mixed after one deselection', async () => {
    const { user } = setup();

    await user.click(sectionCheckbox('Yōon'));
    expect(status()).toHaveTextContent('33 selected');
    expect(rowCheckbox('きゃ')).toHaveAttribute('aria-checked', 'true');

    await user.click(kana('ぎょ gyo'));
    expect(sectionCheckbox('Yōon')).toHaveAttribute('aria-checked', 'mixed');
    expect(rowCheckbox('ぎゃ')).toHaveAttribute('aria-checked', 'mixed');
    expect(sectionCheckbox('Basic')).toHaveAttribute('aria-checked', 'false');
  });

  it('selects everything and clears the selection', async () => {
    const { user } = setup('katakana');

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(status()).toHaveTextContent('104 selected');
    expect(kana('ン n')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Select all' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(status()).toHaveTextContent('0 selected');
    expect(kana('ン n')).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps distinct characters with a shared reading separate', async () => {
    const { user } = setup();

    await user.click(kana('じ ji'));
    expect(kana('じ ji')).toHaveAttribute('aria-pressed', 'true');
    expect(kana('ぢ ji')).toHaveAttribute('aria-pressed', 'false');
  });

  it('works from the keyboard: arrows move within a row, Space toggles', async () => {
    const { user } = setup();

    await user.click(kana('か ka'));
    await user.keyboard('{ArrowRight}');
    expect(kana('き ki')).toHaveFocus();
    await user.keyboard(' ');
    expect(kana('き ki')).toHaveAttribute('aria-pressed', 'true');

    await user.tab();
    expect(rowCheckbox('さ')).toHaveFocus();
    await user.keyboard(' ');
    expect(rowCheckbox('さ')).toHaveAttribute('aria-checked', 'true');
    expect(status()).toHaveTextContent('7 selected');
  });

  describe('progress', () => {
    it('says when nothing has been recorded yet and shows no indicators', async () => {
      const { user } = setup();

      expect(screen.getByText('Loading statistics…')).toBeInTheDocument();
      await screen.findByText(/^Nothing recorded yet\./);
      expect(document.querySelector('[data-slot="kana-progress"]')).toBeNull();
      expect(kana('し shi')).not.toHaveAttribute('aria-describedby');

      await openStatistics(user);
      expect(statisticsStatus()).toHaveTextContent(/^Nothing recorded yet\./);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('marks practised kana with the share of independent first answers', async () => {
      server.use(
        progressResponse([
          stats('hiragana:si', {
            assistedCorrect: 1,
            attempts: 4,
            incorrect: 1,
            independentCorrect: 1,
            skipped: 1,
          }),
          stats('hiragana:a', {
            attempts: 1,
            independentCorrect: 0,
            skipped: 1,
          }),
        ]),
      );
      setup();

      await screen.findByText('2 kana practised, 5 questions recorded.');
      expect(kana('し shi')).toHaveAccessibleDescription(
        'Practised 4 times, 1 correct on the first try without a hint.',
      );
      const bar = kana('し shi').querySelector(
        '[data-slot="kana-progress"] > span',
      );
      expect(bar).toHaveStyle({ width: '25%' });
      expect(
        kana('あ a').querySelector('[data-slot="kana-progress"] > span'),
      ).toHaveStyle({ width: '0%' });
      expect(
        kana('か ka').querySelector('[data-slot="kana-progress"]'),
      ).toBeNull();
    });

    it('lists the four outcomes per kana in a visible table, in catalog order', async () => {
      server.use(
        progressResponse([
          stats('hiragana:si', {
            assistedCorrect: 1,
            attempts: 4,
            corrected: 1,
            incorrect: 1,
            independentCorrect: 1,
            skipped: 1,
          }),
          stats('hiragana:a'),
        ]),
      );
      const { user } = setup();

      await openStatistics(user);
      const table = await screen.findByRole('table');
      expect(table).toHaveAccessibleName(/^Statistics per kana/);
      const rows = within(table).getAllByRole('row');
      expect(rows.map((row) => row.textContent)).toEqual([
        'KanaQuestionsCorrect, no hintCorrect with hintIncorrectSkippedLast saved',
        expect.stringMatching(/^あ a44000/) as unknown,
        expect.stringMatching(/^し shi41111/) as unknown,
      ]);
    });

    it('keeps selection and practice available when progress cannot load', async () => {
      server.use(
        http.get(PROGRESS, () =>
          HttpResponse.json({ message: 'down' }, { status: 503 }),
        ),
      );
      const { user } = setup();

      await screen.findByText('Statistics could not be loaded.');
      await user.click(kana('し shi'));
      expect(status()).toHaveTextContent('1 selected');
      expect(
        screen.getByRole('button', { name: 'Start practice' }),
      ).toBeEnabled();

      await openStatistics(user);
      expect(statisticsStatus()).toHaveTextContent(
        'Statistics could not be loaded.',
      );
      server.use(progressResponse([stats('hiragana:si')]));
      await user.click(
        screen.getByRole('button', { name: 'Reload statistics' }),
      );
      expect(await screen.findByText(/^1 kana practised, /)).toBeVisible();
    });

    it('reports results from this device that are not saved yet', async () => {
      window.localStorage.setItem(
        'shiori:kana-attempts:alice',
        JSON.stringify({
          pending: [
            {
              answer: '',
              corrected: false,
              direction: 'kana-to-romaji',
              hintUsed: false,
              kanaId: 'hiragana:si',
              outcome: 'skipped',
              questionIndex: 0,
              roundId: '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10',
            },
          ],
          rejected: [],
          version: 1,
        }),
      );
      server.use(
        http.post('*/api/kana-progress/attempts', () => HttpResponse.error()),
      );
      const { user } = setup();
      await openStatistics(user);

      expect(
        await screen.findByText(/1 result from this device not saved yet\./),
      ).toBeVisible();
      expect(
        await screen.findByRole('button', { name: 'Save now' }),
      ).toBeVisible();
    });

    it('refreshes the statistics once pending results are saved', async () => {
      window.localStorage.setItem(
        'shiori:kana-attempts:alice',
        JSON.stringify({
          pending: [
            {
              answer: 'shi',
              corrected: false,
              direction: 'kana-to-romaji',
              hintUsed: false,
              kanaId: 'hiragana:si',
              outcome: 'correct',
              questionIndex: 0,
              roundId: '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10',
            },
          ],
          rejected: [],
          version: 1,
        }),
      );
      let saved = false;
      server.use(
        http.post('*/api/kana-progress/attempts', () => {
          saved = true;
          return HttpResponse.json({ duplicates: 0, recorded: 1 });
        }),
        http.get(PROGRESS, () =>
          HttpResponse.json({
            direction: 'kana-to-romaji',
            kana: saved ? [stats('hiragana:si', { attempts: 1 })] : [],
            script: 'hiragana',
          }),
        ),
      );
      const { user } = setup();
      await openStatistics(user);

      expect(await screen.findByText(/^1 kana practised, /)).toBeVisible();
      expect(
        window.localStorage.getItem('shiori:kana-attempts:alice'),
      ).toBeNull();
    });
  });

  describe('replacing an unfinished round', () => {
    const awaitingCorrection = () =>
      play(
        createSession(['hiragana:a', 'hiragana:ka'], {
          random: () => 0.999,
          roundId: ROUND,
        }),
        { type: 'hint' },
        { type: 'input', value: 'o' },
        { type: 'submit' },
      );

    beforeEach(() => {
      writeKanaState('hiragana', 'alice', {
        selection: ['hiragana:a', 'hiragana:ka'],
        session: awaitingCorrection(),
      });
    });

    it('records a wrong answer awaiting correction once, as incorrect with its hint, when a new round starts', async () => {
      const sent = recordAttempts(() =>
        HttpResponse.json({ duplicates: 0, recorded: 1 }),
      );
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Start new round' }));

      await waitFor(() => {
        expect(readPendingAttempts('alice').pending).toEqual([]);
      });
      expect(sent).toEqual([
        {
          answer: 'o',
          corrected: false,
          direction: 'kana-to-romaji',
          hintUsed: true,
          kanaId: 'hiragana:a',
          outcome: 'incorrect',
          questionIndex: 0,
          roundId: ROUND,
        },
      ]);
      expect(readKanaState('hiragana', 'alice').session?.roundId).not.toBe(
        ROUND,
      );
    });

    it('records nothing when the round is only left to resume later', async () => {
      const sent = recordAttempts(() =>
        HttpResponse.json({ duplicates: 0, recorded: 1 }),
      );
      const { user } = setup();

      await user.click(
        screen.getByRole('link', { name: 'Resume practice 1/2' }),
      );

      expect(sent).toEqual([]);
      expect(readPendingAttempts('alice').pending).toEqual([]);
      expect(readKanaState('hiragana', 'alice').session).toEqual(
        awaitingCorrection(),
      );
    });
  });

  describe('refused results', () => {
    const storeQueue = (queue: Record<string, PendingKanaAttempt[]>) => {
      window.localStorage.setItem(
        'shiori:kana-attempts:alice',
        JSON.stringify({ pending: [], rejected: [], version: 1, ...queue }),
      );
    };

    it('sends results refused by an earlier version again on request', async () => {
      storeQueue({ rejected: [pendingAttempt(0), pendingAttempt(1)] });
      const sent = recordAttempts(() =>
        HttpResponse.json({ duplicates: 0, recorded: 2 }),
      );
      const { user } = setup();
      await openStatistics(user);

      expect(
        await screen.findByText(
          '2 results were refused by the server and kept on this device.',
        ),
      ).toBeVisible();
      expect(sent).toEqual([]);

      await user.click(screen.getByRole('button', { name: 'Send again' }));

      await waitFor(() => {
        expect(screen.queryByText(/refused by the server/)).toBeNull();
      });
      expect(sent).toEqual([pendingAttempt(0), pendingAttempt(1)]);
      expect(
        window.localStorage.getItem('shiori:kana-attempts:alice'),
      ).toBeNull();
    });

    it('offers only removal for results the server named invalid', async () => {
      storeQueue({ invalid: [pendingAttempt(0)] });
      const { user } = setup();
      await openStatistics(user);

      expect(
        await screen.findByText(
          '1 result was refused by the server and kept on this device.',
        ),
      ).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Send again' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Remove…' })).toBeVisible();
    });

    it('removes refused results only after confirmation and keeps unsaved ones', async () => {
      storeQueue({
        invalid: [pendingAttempt(1)],
        pending: [pendingAttempt(2)],
        rejected: [pendingAttempt(0)],
      });
      recordAttempts(() => HttpResponse.error());
      const { user } = setup();
      await openStatistics(user);

      await user.click(await screen.findByRole('button', { name: 'Remove…' }));
      const confirmation = await screen.findByRole('alertdialog', {
        name: 'Remove refused results?',
      });
      expect(readPendingAttempts('alice').rejected).toHaveLength(1);

      await user.click(
        within(confirmation).getByRole('button', { name: 'Remove' }),
      );

      await waitFor(() => {
        expect(screen.queryByText(/refused by the server/)).toBeNull();
      });
      expect(readPendingAttempts('alice')).toEqual({
        invalid: [],
        pending: [pendingAttempt(2)],
        rejected: [],
      });
      expect(statisticsStatus()).toHaveTextContent(
        '1 result from this device not saved yet.',
      );
    });
    it('confirms removal from the keyboard, starting on the safe choice', async () => {
      storeQueue({ rejected: [pendingAttempt(0)] });
      const { user } = setup();
      await openStatistics(user);
      const trigger = await screen.findByRole('button', { name: 'Remove…' });

      trigger.focus();
      await user.keyboard('{Enter}');
      const confirmation = await screen.findByRole('alertdialog', {
        name: 'Remove refused results?',
      });
      const keep = within(confirmation).getByRole('button', { name: 'Keep' });
      const remove = within(confirmation).getByRole('button', {
        name: 'Remove',
      });
      await waitFor(() => {
        expect(keep).toHaveFocus();
      });
      await user.tab();
      expect(remove).toHaveFocus();
      await user.tab();
      await waitFor(() => {
        expect(keep).toHaveFocus();
      });

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(confirmation).not.toBeInTheDocument();
      });
      expect(trigger).toHaveFocus();
      expect(readPendingAttempts('alice').rejected).toHaveLength(1);

      await user.keyboard('{Enter}');
      await user.keyboard('{Enter}');
      expect(readPendingAttempts('alice').rejected).toHaveLength(1);
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      await user.keyboard('{Enter}');
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.queryByText(/refused by the server/)).toBeNull();
      });
      expect(readPendingAttempts('alice').rejected).toEqual([]);
      expect(statisticsStatus()).toHaveFocus();
    });
  });

  describe('tabs', () => {
    it('shows the practice actions in one footer, and none on Statistics', async () => {
      const { user } = setup();
      const start = screen.getByRole('button', { name: 'Start practice' });
      const footer = start.closest('.sticky');
      if (!(footer instanceof HTMLElement)) throw new Error('Missing footer');

      expect(
        within(footer)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Select all', 'Clear', 'Start practice']);
      expect(within(footer).getByRole('status')).toHaveTextContent(
        '0 selected',
      );
      expect(
        within(footer).getByRole('spinbutton', { name: 'Questions' }),
      ).toBeVisible();

      await openStatistics(user);
      expect(
        screen.queryByRole('button', { name: 'Start practice' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('spinbutton', { name: 'Questions' }),
      ).not.toBeInTheDocument();
    });

    it('keeps the count description for screen readers and shows only errors', async () => {
      const { user } = setup();
      await user.click(kana('し shi'));
      const count = screen.getByRole('spinbutton', { name: 'Questions' });

      expect(count).toHaveAccessibleDescription('1 question · each kana once');
      expect(screen.getByText('1 question · each kana once')).toHaveClass(
        'sr-only',
      );
      await user.clear(count);
      await user.type(count, '0');
      expect(
        screen.getByText('Enter a whole number from 1 to 1,000.'),
      ).not.toHaveClass('sr-only');
    });

    it('keeps the selection and the question count when switching tabs', async () => {
      const { user } = setup();
      await user.click(kana('し shi'));
      await user.click(kana('ち chi'));
      const count = screen.getByRole('spinbutton', { name: 'Questions' });
      await user.clear(count);
      await user.type(count, '7');

      await openStatistics(user);
      expect(
        screen.queryByRole('button', { name: 'し shi' }),
      ).not.toBeInTheDocument();
      await user.click(tab('Practice'));

      expect(kana('し shi')).toHaveAttribute('aria-pressed', 'true');
      expect(kana('ち chi')).toHaveAttribute('aria-pressed', 'true');
      expect(status()).toHaveTextContent('2 selected');
      expect(screen.getByRole('spinbutton', { name: 'Questions' })).toHaveValue(
        7,
      );
    });

    it('keeps an unfinished round, its order and Resume across tabs', async () => {
      writeKanaState('hiragana', 'alice', {
        session: createSession(['hiragana:a', 'hiragana:i', 'hiragana:u']),
      });
      const before = readKanaState('hiragana', 'alice').session;
      const { user } = setup();

      await openStatistics(user);
      await user.click(tab('Practice'));

      expect(
        screen.getByRole('link', { name: /Resume practice 1\/3/ }),
      ).toBeVisible();
      expect(readKanaState('hiragana', 'alice').session).toEqual(before);
    });

    it('moves between tabs with the arrow keys without leaving the tab list', async () => {
      const { user } = setup();

      await user.click(tab('Practice'));
      await user.keyboard('{ArrowRight}');
      expect(tab('Statistics')).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(tab('Statistics')).toHaveAttribute('aria-selected', 'true');
      expect(
        screen.getByRole('tabpanel', { name: 'Statistics' }),
      ).toBeVisible();
      await user.keyboard('{ArrowLeft}{Enter}');
      expect(tab('Practice')).toHaveFocus();
      expect(tab('Practice')).toHaveAttribute('aria-selected', 'true');
    });

    it('loads statistics once for both tabs', async () => {
      let requests = 0;
      server.use(
        http.get(PROGRESS, () => {
          requests += 1;
          return HttpResponse.json({
            direction: 'kana-to-romaji',
            kana: [stats('hiragana:si')],
            script: 'hiragana',
          });
        }),
      );
      const { user } = setup();

      await screen.findByText(/^1 kana practised/);
      await openStatistics(user);
      await user.click(tab('Practice'));
      await openStatistics(user);

      expect(screen.getByRole('table')).toBeVisible();
      expect(requests).toBe(1);
    });
  });

  describe('section information', () => {
    it.each([
      ['Basic', 'Gojūon, the core characters.'],
      ['Dakuten & handakuten', /Voiced and semi-voiced characters/],
      ['Yōon', 'Combinations with a small ya, yu or yo.'],
    ])('explains %s on request instead of permanently', async (title, text) => {
      const { user } = setup();
      expect(screen.queryByText(text)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: `About ${title}` }));
      const popup = await screen.findByRole('dialog');
      expect(within(popup).getByText(text)).toBeVisible();
      expect(within(popup).getByText(title)).toBeVisible();
    });

    it('opens from the keyboard, closes with Escape and returns focus', async () => {
      const { user } = setup();
      const trigger = screen.getByRole('button', { name: 'About Yōon' });

      trigger.focus();
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('dialog')).toBeVisible();
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(trigger).toHaveFocus();
    });

    it('opens on hover', async () => {
      const { user } = setup();

      await user.hover(screen.getByRole('button', { name: 'About Basic' }));
      expect(
        await screen.findByText('Gojūon, the core characters.'),
      ).toBeVisible();
    });

    it('leaves the section selection alone', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'About Basic' }));
      await user.keyboard('{Escape}');
      expect(sectionCheckbox('Basic')).toHaveAttribute('aria-checked', 'false');
      expect(status()).toHaveTextContent('0 selected');

      await user.click(sectionCheckbox('Basic'));
      expect(status()).toHaveTextContent('46 selected');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
