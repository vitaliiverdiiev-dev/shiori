import { Button } from '@/shared/ui';
import { useHealthStatus } from './hooks/use-health-status';
import { apiText, databaseText } from './model/consts';
import { StatusRow } from './ui/status-row';

export const HealthStatus = () => {
  const { retry, status } = useHealthStatus();

  return (
    <section
      aria-label="Server status"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div aria-live="polite" className="flex flex-col gap-3" role="status">
        <StatusRow
          detail={status.api === 'offline' ? status.reason : undefined}
          state={status.api}
          text={apiText[status.api]}
        />
        <StatusRow
          state={status.database}
          text={databaseText[status.database]}
        />
      </div>
      <Button
        className="w-full sm:w-auto"
        disabled={status.api === 'checking'}
        onClick={retry}
        size="lg"
        variant="outline"
      >
        Check again
      </Button>
    </section>
  );
};
