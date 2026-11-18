import { Link } from 'react-router';
import { authPaths } from '../model/consts';

export const SignUpComplete = () => (
  <div className="flex flex-col gap-4">
    <h2
      className="text-xl font-semibold tracking-tight outline-none"
      ref={(node) => {
        node?.focus();
      }}
      tabIndex={-1}
    >
      Registration submitted
    </h2>
    <p className="text-muted-foreground">
      If your invitation and details were accepted, your account is ready. Sign
      in with the email and password you just entered.
    </p>
    <Link
      className="flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
      to={authPaths.signIn}
    >
      Go to sign in
    </Link>
  </div>
);
