import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { createSession } from '../helpers/session';
import { writeKanaState } from '../helpers/storage';
import type { KanaPracticeSession } from '../model/types';
import { KanaPractice } from './kana-practice';

const USER = 'storybook';
const round = createSession([
  'hiragana:a',
  'hiragana:si',
  'hiragana:tu',
  'hiragana:kyu',
  'hiragana:zya',
]);

const seed = (session: KanaPracticeSession) => () => {
  window.sessionStorage.clear();
  writeKanaState('hiragana', USER, { session });
};

const meta = {
  args: { script: 'hiragana', userId: USER },
  beforeEach: seed(round),
  component: KanaPractice,
  render: (args) => (
    <MemoryRouter>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-6 sm:pt-8">
        <KanaPractice {...args} />
      </main>
    </MemoryRouter>
  ),
  title: 'Kana/KanaPractice',
} satisfies Meta<typeof KanaPractice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Answering: Story = {};

export const Complete: Story = {
  beforeEach: seed({
    ...round,
    attempts: round.order.map((kanaId, index) => ({
      answer: index === 0 ? 'x' : 'ok',
      kanaId,
      outcome: index === 0 ? 'incorrect' : index === 1 ? 'skipped' : 'correct',
    })),
    position: round.order.length,
  }),
};
