import { ModuleLoadError } from '@/shared/helpers/lazy-component';
import { Button } from '../../primitives/button/button';

type Props = {
  error: unknown;
  onRetry: () => void;
};

export const ErrorFallback = ({ error, onRetry }: Props) => {
  const moduleFailed = error instanceof ModuleLoadError;
  const copy = moduleFailed
    ? {
        description: 'Check your connection, then reload the page.',
        title: 'This page couldn’t load',
      }
    : {
        description:
          'Something stopped this page from working. Try again, or reload the page if the problem continues.',
        title: 'Something went wrong',
      };

  return (
    <div className="flex flex-col gap-4" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="text-muted-foreground">{copy.description}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!moduleFailed && (
          <Button className="w-full sm:w-auto" onClick={onRetry} size="lg">
            Try again
          </Button>
        )}
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            window.location.reload();
          }}
          size="lg"
          variant={moduleFailed ? 'default' : 'outline'}
        >
          Reload page
        </Button>
      </div>
    </div>
  );
};
