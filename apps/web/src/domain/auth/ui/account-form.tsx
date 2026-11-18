import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import { accountMessages } from '../model/consts';
import { accountNameSchema } from '../model/schemas';
import type { AuthOutcome } from '../model/types';
import { FormMessage } from './form-message';
import { TextField } from './text-field';

export const AccountForm = () => {
  const { data } = authClient.useSession();
  const [outcome, setOutcome] = useState<AuthOutcome>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm({
    resolver: zodResolver(accountNameSchema),
    values: { name: data?.user.name ?? '' },
  });

  const onSubmit = handleSubmit(async ({ name }) => {
    setOutcome(undefined);
    const result = await runAuthAction(
      () => authClient.updateUser({ name }),
      accountMessages,
    );
    setOutcome(result);
  });

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
    >
      <TextField
        autoComplete="name"
        error={errors.name?.message}
        label="Name"
        {...register('name')}
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Email</p>
        <p className="break-all">{data?.user.email}</p>
        <p className="text-sm text-muted-foreground">
          Your email address cannot be changed yet.
        </p>
      </div>
      {outcome &&
        (outcome.ok ? (
          <FormMessage tone="success">Name updated.</FormMessage>
        ) : (
          <FormMessage tone="error">{outcome.message}</FormMessage>
        ))}
      <Button
        className="w-full sm:w-auto sm:self-start"
        disabled={isSubmitting}
        size="lg"
        type="submit"
      >
        {isSubmitting ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  );
};
