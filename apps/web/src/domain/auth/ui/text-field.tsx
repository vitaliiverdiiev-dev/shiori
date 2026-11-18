import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/shared/helpers/cn';
import { Input, Label } from '@/shared/ui';

type Props = ComponentProps<'input'> & {
  action?: ReactNode;
  description?: string | undefined;
  error?: string | undefined;
  label: string;
};

export const TextField = ({
  action,
  className,
  description,
  error,
  label,
  ...inputProps
}: Props) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description && descriptionId, error && errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cn('h-9', action && 'pr-16', className)}
          id={id}
          {...inputProps}
        />
        {action}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
};
