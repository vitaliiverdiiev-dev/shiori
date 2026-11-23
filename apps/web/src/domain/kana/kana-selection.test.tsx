import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { KanaSelection } from './kana-selection';
import type { KanaProgressStats } from './model/types';

const PROGRESS = '*/api/kana-progress';

function progressResponse(kana: KanaProgressStats[] = []) {
  return http.get(PROGRESS, ({ request }) =>
    HttpResponse.json({
      direction: 'kana-to-romaji',
      kana,
      script: new URL(request.url).searchParams.get('script'),
    }),
  );
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
const progressStatus = () =>
  within(screen.getByRole('region', { name: 'Progress' })).getByRole('status');
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

    expect(status()).toHaveTextContent('0 of 104 selected');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Basic', 'Dakuten & handakuten', 'Yōon', 'Progress']);
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects and deselects single characters independently', async () => {
    const { user } = setup();

    await user.click(kana('し shi'));
    await user.click(kana('ち chi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('2 of 104 selected');

    await user.click(kana('し shi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
    expect(kana('ち chi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('1 of 104 selected');
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
    expect(status()).toHaveTextContent('5 of 104 selected');

    await user.click(rowCheckbox('か'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'false');
    expect(status()).toHaveTextContent('0 of 104 selected');
  });

  it('selects a whole section and marks it mixed after one deselection', async () => {
    const { user } = setup();

    await user.click(sectionCheckbox('Yōon'));
    expect(status()).toHaveTextContent('33 of 104 selected');
    expect(rowCheckbox('きゃ')).toHaveAttribute('aria-checked', 'true');

    await user.click(kana('ぎょ gyo'));
    expect(sectionCheckbox('Yōon')).toHaveAttribute('aria-checked', 'mixed');
    expect(rowCheckbox('ぎゃ')).toHaveAttribute('aria-checked', 'mixed');
    expect(sectionCheckbox('Basic')).toHaveAttribute('aria-checked', 'false');
  });

  it('selects everything and clears the selection', async () => {
    const { user } = setup('katakana');

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(status()).toHaveTextContent('104 of 104 selected');
    expect(kana('ン n')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Select all' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(status()).toHaveTextContent('0 of 104 selected');
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
    expect(status()).toHaveTextContent('7 of 104 selected');
  });

  describe('progress', () => {
    it('says when nothing has been recorded yet and shows no indicators', async () => {
      setup();

      expect(progressStatus()).toHaveTextContent('Loading progress…');
      expect(await screen.findByText(/^Nothing recorded yet\./)).toBeVisible();
      expect(document.querySelector('[data-slot="kana-progress"]')).toBeNull();
      expect(kana('し shi')).not.toHaveAttribute('aria-describedby');
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

      expect(await screen.findByText('2 kana practised.')).toBeVisible();
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

    it('lists the four outcomes per kana in the details, in catalog order', async () => {
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

      await user.click(await screen.findByText('Details per kana'));
      const rows = within(screen.getByRole('table')).getAllByRole('row');
      expect(rows.map((row) => row.textContent)).toEqual([
        'KanaQuestionsCorrectWith hintIncorrectSkippedLast practised',
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

      expect(
        await screen.findByText('Progress could not be loaded.'),
      ).toBeVisible();
      await user.click(kana('し shi'));
      expect(status()).toHaveTextContent('1 of 104 selected');
      expect(
        screen.getByRole('button', { name: 'Start practice' }),
      ).toBeEnabled();

      server.use(progressResponse([stats('hiragana:si')]));
      await user.click(screen.getByRole('button', { name: 'Reload progress' }));
      expect(await screen.findByText('1 kana practised.')).toBeVisible();
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
      setup();

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
      setup();

      expect(await screen.findByText('1 kana practised.')).toBeVisible();
      expect(
        window.localStorage.getItem('shiori:kana-attempts:alice'),
      ).toBeNull();
    });
  });
});
