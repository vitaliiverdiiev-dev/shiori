import { SignInForm, SignUpLink } from '@/domain/auth';

export const SignInPage = () => (
  <main className="flex flex-col gap-8">
    <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
    <SignInForm />
    <SignUpLink />
  </main>
);
