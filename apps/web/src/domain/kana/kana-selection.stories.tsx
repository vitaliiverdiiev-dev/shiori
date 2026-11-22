import type { Meta, StoryObj } from '@storybook/react-vite';
import { KanaSelection } from './kana-selection';

const meta = {
  args: { script: 'hiragana' },
  component: KanaSelection,
  render: (args) => (
    <div className="max-w-2xl p-4">
      <KanaSelection {...args} />
    </div>
  ),
  title: 'Kana/KanaSelection',
} satisfies Meta<typeof KanaSelection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hiragana: Story = {};
export const Katakana: Story = { args: { script: 'katakana' } };
