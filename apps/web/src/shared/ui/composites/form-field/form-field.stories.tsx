import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../../primitives/input/input';
import { PasswordInput } from '../password-input/password-input';
import { FormField } from './form-field';

const meta = {
  args: {
    children: (control) => (
      <Input {...control} autoComplete="email" type="email" />
    ),
    label: 'Email',
  },
  component: FormField,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  title: 'UI/FormField',
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Description: Story = {
  args: { description: 'We only use it to sign you in.' },
};

export const Invalid: Story = {
  args: {
    error: { message: 'Enter a valid email address.' },
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    children: (control) => <Input {...control} disabled type="email" />,
  },
};

export const Password: Story = {
  args: {
    children: (control) => (
      <PasswordInput
        {...control}
        autoComplete="new-password"
        defaultValue="まなぶ ことは たのしい"
        fieldLabel="Password"
      />
    ),
    description: 'Use 15 to 128 characters.',
    label: 'Password',
  },
};

export const PasswordInvalid: Story = {
  args: {
    ...Password.args,
    error: { message: 'This password is too common. Choose another.' },
  },
};

export const PasswordDisabled: Story = {
  args: {
    children: (control) => (
      <PasswordInput {...control} disabled fieldLabel="Password" />
    ),
    label: 'Password',
  },
};
