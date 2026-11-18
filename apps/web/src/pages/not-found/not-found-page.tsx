import { Link } from 'react-router';

export const NotFoundPage = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-5">
    <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
    <p className="text-muted-foreground">
      This page does not exist or has moved.
    </p>
    <Link
      className="flex min-h-11 items-center self-start font-medium text-primary underline-offset-4 hover:underline"
      to="/"
    >
      Go to home
    </Link>
  </main>
);
