import { getExpectedKana } from '@shiori/kana';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createSession } from '../helpers/session';
import { writeKanaState } from '../helpers/storage';
import type { KanaPracticeSession } from '../model/types';
import { KanaPractice } from './kana-practice';

const USER = 'storybook';
const queryClient = new QueryClient();
const round = createSession([
  'hiragana:a',
  'hiragana:si',
  'hiragana:tu',
  'hiragana:kyu',
  'hiragana:zya',
]);

const seed = (session: KanaPracticeSession) => () => {
  window.sessionStorage.clear();
  window.localStorage.removeItem(`shiori:kana-attempts:${USER}`);
  writeKanaState('hiragana', USER, { session });
};

const meta = {
  args: { script: 'hiragana', userId: USER },
  beforeEach: seed(round),
  component: KanaPractice,
  render: (args) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-6 sm:pt-8">
          <KanaPractice {...args} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>
  ),
  title: 'Kana/KanaPractice',
} satisfies Meta<typeof KanaPractice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Answering: Story = {};

const finished: KanaPracticeSession = {
  ...round,
  inputs: [],
  position: round.order.length,
  results: round.order.map((question, index) =>
    getExpectedKana(question).map(({ id }) => ({
      answer: index === 0 ? 'x' : 'ok',
      kanaId: id,
      outcome: index === 0 ? 'incorrect' : index === 1 ? 'skipped' : 'correct',
    })),
  ),
};

export const Complete: Story = { beforeEach: seed(finished) };

export const CompleteWithUnsavedResults: Story = {
  beforeEach: () => {
    seed(finished)();
    window.localStorage.setItem(
      `shiori:kana-attempts:${USER}`,
      JSON.stringify({
        pending: round.order.map((question, questionIndex) => ({
          answer: '',
          corrected: false,
          direction: question.direction,
          hintUsed: false,
          kanaId: getExpectedKana(question)[0]?.id,
          outcome: 'skipped',
          questionIndex,
          roundId: round.roundId,
        })),
        rejected: [],
        version: 1,
      }),
    );
  },
};
