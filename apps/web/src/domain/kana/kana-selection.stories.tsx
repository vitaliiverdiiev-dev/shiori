import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { KanaSelection } from './kana-selection';

const meta = {
  args: { script: 'hiragana', userId: 'storybook' },
  beforeEach: () => {
    window.sessionStorage.clear();
  },
  component: KanaSelection,
  render: (args) => (
    <MemoryRouter>
      <div className="max-w-2xl p-4">
        <KanaSelection {...args} />
      </div>
    </MemoryRouter>
  ),
  title: 'Kana/KanaSelection',
} satisfies Meta<typeof KanaSelection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hiragana: Story = {};
export const Katakana: Story = { args: { script: 'katakana' } };
