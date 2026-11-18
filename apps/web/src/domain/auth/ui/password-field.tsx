import { type ComponentProps, useState } from 'react';
import { TextField } from './text-field';

type Props = Omit<ComponentProps<typeof TextField>, 'action' | 'type'>;

export const PasswordField = ({ label, ...fieldProps }: Props) => {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      action={
        <button
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          className="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center rounded-r-lg px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => {
            setVisible((current) => !current);
          }}
          type="button"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
      autoCapitalize="none"
      autoCorrect="off"
      label={label}
      spellCheck={false}
      type={visible ? 'text' : 'password'}
      {...fieldProps}
    />
  );
};
