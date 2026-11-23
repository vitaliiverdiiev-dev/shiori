import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { kanaProgressQuery } from './api/queries';
import { KanaSelection } from './kana-selection';
import type { KanaProgressStats } from './model/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const stats = (
  kanaId: string,
  attempts: number,
  independentCorrect: number,
): KanaProgressStats => ({
  assistedCorrect: Math.floor((attempts - independentCorrect) / 2),
  attempts,
  corrected: 0,
  incorrect: Math.ceil((attempts - independentCorrect) / 2),
  independentCorrect,
  kanaId,
  lastPracticedAt: '2026-11-20T10:00:00.000Z',
  skipped: 0,
});

const seedProgress = (kana: KanaProgressStats[] | null) => () => {
  window.sessionStorage.clear();
  queryClient.clear();
  if (kana) {
    queryClient.setQueryData(kanaProgressQuery('hiragana').queryKey, {
      direction: 'kana-to-romaji',
      kana,
      script: 'hiragana',
    });
  }
};

const meta = {
  args: { script: 'hiragana', userId: 'storybook' },
  beforeEach: seedProgress([]),
  component: KanaSelection,
  render: (args) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <div className="overflow-x-clip p-4">
          <KanaSelection {...args} />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  ),
  title: 'Kana/KanaSelection',
} satisfies Meta<typeof KanaSelection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hiragana: Story = {};

export const WithProgress: Story = {
  beforeEach: seedProgress([
    stats('hiragana:a', 6, 6),
    stats('hiragana:i', 5, 4),
    stats('hiragana:u', 4, 2),
    stats('hiragana:e', 3, 0),
    stats('hiragana:si', 8, 5),
    stats('hiragana:tu', 2, 1),
    stats('hiragana:kyu', 1, 0),
  ]),
};

export const ProgressUnavailable: Story = {
  beforeEach: seedProgress(null),
};

export const Katakana: Story = { args: { script: 'katakana' } };
