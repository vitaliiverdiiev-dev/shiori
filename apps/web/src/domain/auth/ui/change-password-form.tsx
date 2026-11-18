import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import { changePasswordMessages, commonMessages } from '../model/consts';
import { changePasswordSchema } from '../model/schemas';
import type { AuthOutcome } from '../model/types';
import { FormMessage } from './form-message';
import { PasswordField } from './password-field';

export const ChangePasswordForm = () => {
  const { data } = authClient.useSession();
  const [outcome, setOutcome] = useState<AuthOutcome>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    defaultValues: {
      confirmPassword: '',
      currentPassword: '',
      newPassword: '',
    },
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setOutcome(undefined);
    const result = await runAuthAction(
      () =>
        authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      changePasswordMessages,
    );
    if (result.ok) reset();
    setOutcome(result);
  });

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
    >
      <input
        autoComplete="username"
        hidden
        readOnly
        type="email"
        value={data?.user.email ?? ''}
      />
      <PasswordField
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        label="Current password"
        {...register('currentPassword')}
      />
      <PasswordField
        autoComplete="new-password"
        description={commonMessages.passwordLength}
        error={errors.newPassword?.message}
        label="New password"
        {...register('newPassword')}
      />
      <PasswordField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        label="Confirm new password"
        {...register('confirmPassword')}
      />
      {outcome &&
        (outcome.ok ? (
          <FormMessage tone="success">
            Password changed. Other devices have been signed out.
          </FormMessage>
        ) : (
          <FormMessage tone="error">{outcome.message}</FormMessage>
        ))}
      <Button
        className="w-full sm:w-auto sm:self-start"
        disabled={isSubmitting}
        size="lg"
        type="submit"
      >
        {isSubmitting ? 'Changing password…' : 'Change password'}
      </Button>
    </form>
  );
};
