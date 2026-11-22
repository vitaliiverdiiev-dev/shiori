import { Link } from 'react-router';
import { authPaths, Registration } from '@/domain/auth';

export const SignUpPage = () => (
  <div className="flex flex-col gap-8">
    <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
    <Registration />
    <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
      Already have an account?
      <Link
        className="flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        to={authPaths.signIn}
      >
        Sign in
      </Link>
    </p>
  </div>
);
