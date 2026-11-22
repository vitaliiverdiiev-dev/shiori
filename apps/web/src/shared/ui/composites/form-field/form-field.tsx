import { type ReactNode, useId } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '../../primitives/field/field';

type Props = {
  children: (control: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    'aria-required': true | undefined;
  }) => ReactNode;
  description?: ReactNode;
  error?: { message?: string } | undefined;
  label: string;
  required?: boolean;
};

export const FormField = ({
  children,
  description,
  error,
  label,
  required = false,
}: Props) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const invalid = error !== undefined;
  const describedBy = [description && descriptionId, invalid && errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': invalid || undefined,
        'aria-required': required || undefined,
      })}
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      <FieldError errors={[error]} id={errorId} />
    </Field>
  );
};
