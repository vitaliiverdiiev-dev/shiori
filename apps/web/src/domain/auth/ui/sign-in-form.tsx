import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';
import {
  Button,
  FieldGroup,
  FormField,
  Input,
  PasswordInput,
} from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import { hasSignedOutNotice } from '../helpers/signed-out-notice';
import { commonMessages, signInMessages } from '../model/consts';
import { signInSchema } from '../model/schemas';
import { FormMessage } from './form-message';

export const SignInForm = () => {
  const location = useLocation();
  const [failure, setFailure] = useState<string>();
  const [signedIn, setSignedIn] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(undefined);
    const outcome = await runAuthAction(
      () => authClient.signIn.email(values),
      signInMessages,
    );
    if (outcome.ok) setSignedIn(true);
    else setFailure(outcome.message);
  });

  const pending = isSubmitting || signedIn;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        {hasSignedOutNotice(location.state) && (
          <p className="text-sm text-muted-foreground" role="status">
            {commonMessages.signedOut}
          </p>
        )}
        <FormField error={errors.email} label="Email" required>
          {(control) => (
            <Input
              {...control}
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              type="email"
              {...register('email')}
            />
          )}
        </FormField>
        <FormField error={errors.password} label="Password" required>
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              fieldLabel="Password"
              {...register('password')}
            />
          )}
        </FormField>
        {failure && <FormMessage tone="error">{failure}</FormMessage>}
        <Button className="w-full" disabled={pending} size="lg" type="submit">
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
};
