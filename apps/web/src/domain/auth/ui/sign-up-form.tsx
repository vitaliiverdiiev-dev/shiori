import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Button,
  FieldGroup,
  FormField,
  Input,
  PasswordInput,
} from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import {
  commonMessages,
  DUPLICATE_ACCOUNT_CODES,
  signUpMessages,
} from '../model/consts';
import { signUpSchema } from '../model/schemas';
import { FormMessage } from './form-message';

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
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <FormField error={errors.name} label="Name" required>
          {(control) => (
            <Input {...control} autoComplete="name" {...register('name')} />
          )}
        </FormField>
        <FormField error={errors.email} label="Email" required>
          {(control) => (
            <Input
              {...control}
              autoCapitalize="none"
              autoComplete="email"
              spellCheck={false}
              type="email"
              {...register('email')}
            />
          )}
        </FormField>
        <FormField
          description={commonMessages.passwordLength}
          error={errors.password}
          label="Password"
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              fieldLabel="Password"
              {...register('password')}
            />
          )}
        </FormField>
        <FormField
          error={errors.confirmPassword}
          label="Confirm password"
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              fieldLabel="Confirm password"
              {...register('confirmPassword')}
            />
          )}
        </FormField>
        <FormField
          error={errors.invitationCode}
          label="Invitation code"
          required
        >
          {(control) => (
            <Input
              {...control}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              {...register('invitationCode')}
            />
          )}
        </FormField>
        {failure && <FormMessage tone="error">{failure}</FormMessage>}
        <Button
          className="w-full"
          disabled={isSubmitting}
          size="lg"
          type="submit"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  );
};
