import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '../label/label';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { id: 'story-input', placeholder: 'you@example.com', type: 'email' },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="story-input">Email</Label>
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { 'aria-invalid': true } };
export const Disabled: Story = { args: { disabled: true } };
