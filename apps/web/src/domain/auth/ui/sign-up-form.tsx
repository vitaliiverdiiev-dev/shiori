import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import {
  commonMessages,
  DUPLICATE_ACCOUNT_CODES,
  signUpMessages,
} from '../model/consts';
import { signUpSchema } from '../model/schemas';
import { FormMessage } from './form-message';
import { PasswordField } from './password-field';
import { TextField } from './text-field';

type Props = {
  onComplete: () => void;
};

export const SignUpForm = ({ onComplete }: Props) => {
  const [failure, setFailure] = useState<string>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm({
    defaultValues: {
      confirmPassword: '',
      email: '',
      invitationCode: '',
      name: '',
      password: '',
    },
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = handleSubmit(
    async ({ email, invitationCode, name, password }) => {
      setFailure(undefined);
      const outcome = await runAuthAction(
        () =>
          authClient.signUp.email({
            email,
            // COMPAT(better-auth@1.7.23): The typed sign-up input omits plugin body fields; the client merges fetchOptions.body into the request body.
            fetchOptions: { body: { invitationCode } },
            name,
            password,
          }),
        signUpMessages,
      );
      if (outcome.ok || DUPLICATE_ACCOUNT_CODES.includes(outcome.code ?? '')) {
        onComplete();
      } else {
        setFailure(outcome.message);
      }
    },
  );

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
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email?.message}
        label="Email"
        spellCheck={false}
        type="email"
        {...register('email')}
      />
      <PasswordField
        autoComplete="new-password"
        description={commonMessages.passwordLength}
        error={errors.password?.message}
        label="Password"
        {...register('password')}
      />
      <PasswordField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        label="Confirm password"
        {...register('confirmPassword')}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        error={errors.invitationCode?.message}
        label="Invitation code"
        spellCheck={false}
        {...register('invitationCode')}
      />
      {failure && <FormMessage tone="error">{failure}</FormMessage>}
      <Button
        className="w-full"
        disabled={isSubmitting}
        size="lg"
        type="submit"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
};
