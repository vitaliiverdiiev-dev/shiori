import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../../primitives/input/input';
import { FormField } from './form-field';

describe('FormField', () => {
  it('labels the control and describes it with its description', () => {
    render(
      <FormField description="Use at least 15 characters." label="Password">
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Password' });
    expect(input).toHaveAccessibleDescription('Use at least 15 characters.');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-required');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('marks a required control', () => {
    render(
      <FormField label="Name" required>
        {(control) => <Input {...control} />}
      </FormField>,
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired();
  });

  it('announces an error and links it after the description', () => {
    render(
      <FormField
        description="Use at least 15 characters."
        error={{ message: 'Password is too short.' }}
        label="Password"
      >
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Password' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Use at least 15 characters. Password is too short.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Password is too short.',
    );
  });
});
