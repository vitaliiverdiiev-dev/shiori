import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, FieldGroup, FormField, PasswordInput } from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import { changePasswordMessages, commonMessages } from '../model/consts';
import { changePasswordSchema } from '../model/schemas';
import type { AuthOutcome } from '../model/types';
import { FormMessage } from './form-message';

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
    resetOptions: { keepFieldsRef: true },
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
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <input
          autoComplete="username"
          hidden
          readOnly
          type="email"
          value={data?.user.email ?? ''}
        />
        <FormField
          error={errors.currentPassword}
          label="Current password"
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              fieldLabel="Current password"
              {...register('currentPassword')}
            />
          )}
        </FormField>
        <FormField
          description={commonMessages.passwordLength}
          error={errors.newPassword}
          label="New password"
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              fieldLabel="New password"
              {...register('newPassword')}
            />
          )}
        </FormField>
        <FormField
          error={errors.confirmPassword}
          label="Confirm new password"
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              fieldLabel="Confirm new password"
              {...register('confirmPassword')}
            />
          )}
        </FormField>
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
      </FieldGroup>
    </form>
  );
};
