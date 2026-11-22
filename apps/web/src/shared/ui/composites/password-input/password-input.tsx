import { type ComponentProps, useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../../primitives/input-group/input-group';

type Props = Omit<ComponentProps<'input'>, 'type'> & {
  fieldLabel: string;
};

export const PasswordInput = ({ fieldLabel, ...inputProps }: Props) => {
  const [visible, setVisible] = useState(false);
  const subject = fieldLabel.toLowerCase();

  return (
    <InputGroup>
      <InputGroupInput
        autoCapitalize="none"
        autoCorrect="off"
        className="rounded-l-[inherit]"
        spellCheck={false}
        {...inputProps}
        type={visible ? 'text' : 'password'}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-controls={inputProps.id}
          aria-label={visible ? `Hide ${subject}` : `Show ${subject}`}
          onClick={() => {
            setVisible((current) => !current);
          }}
          size="icon-sm"
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};
