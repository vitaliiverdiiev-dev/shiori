import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { registrationQuery } from '../api/queries';
import { authPaths } from '../model/consts';

export const SignUpLink = () => {
  const registration = useQuery(registrationQuery);
  if (registration.data?.mode !== 'invite') return null;

  return (
    <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
      Have an invitation?
      <Link
        className="flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        to={authPaths.signUp}
      >
        Create an account
      </Link>
    </p>
  );
};
