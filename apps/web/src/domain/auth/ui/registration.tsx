import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui';
import { registrationQuery } from '../api/queries';
import { FormMessage } from './form-message';
import { SignUpComplete } from './sign-up-complete';
import { SignUpForm } from './sign-up-form';

export const Registration = () => {
  const registration = useQuery(registrationQuery);
  const [completed, setCompleted] = useState(false);

  if (completed) return <SignUpComplete />;

  if (registration.isPending) {
    return (
      <p className="text-muted-foreground" role="status">
        Checking whether registration is open…
      </p>
    );
  }

  if (registration.isError) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="error">
          Could not check whether registration is open.
        </FormMessage>
        <Button
          className="w-full sm:w-auto"
          disabled={registration.isFetching}
          onClick={() => void registration.refetch()}
          size="lg"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (registration.data.mode !== 'invite') {
    return (
      <p className="text-muted-foreground">
        Registration is closed. New accounts cannot be created right now.
      </p>
    );
  }

  return (
    <SignUpForm
      onComplete={() => {
        setCompleted(true);
      }}
    />
  );
};
