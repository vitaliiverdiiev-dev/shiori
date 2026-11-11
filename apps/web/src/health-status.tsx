import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type HealthState =
  | { kind: 'checking' }
  | { kind: 'online' }
  | { kind: 'offline'; reason: string };

function isHealthy(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ok'
  );
}

const HEALTH_TIMEOUT_MS = 5000;

async function requestHealth(): Promise<HealthState> {
  try {
    const response = await fetch('/api/health', {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        kind: 'offline',
        reason: `API responded ${String(response.status)}`,
      };
    }
    const body: unknown = await response.json();
    return isHealthy(body)
      ? { kind: 'online' }
      : { kind: 'offline', reason: 'Unexpected health response' };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError';
    return {
      kind: 'offline',
      reason: timedOut ? 'API did not respond in time' : 'API is unreachable',
    };
  }
}

// Shared in-flight request: StrictMode's dev remount and concurrent callers
// reuse it instead of firing (and cancelling) duplicate requests.
let inFlight: Promise<HealthState> | undefined;

function checkHealth(): Promise<HealthState> {
  inFlight ??= requestHealth().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

const labels = {
  checking: 'Checking API…',
  online: 'API online',
  offline: 'API offline',
} as const;

const dotColors = {
  checking: 'bg-muted-foreground animate-pulse',
  online: 'bg-success',
  offline: 'bg-destructive',
} as const;

export function HealthStatus() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HealthState>({ kind: 'checking' });

  useEffect(() => {
    let active = true;
    void checkHealth().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <section
      aria-label="Server status"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div role="status" aria-live="polite" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${dotColors[state.kind]}`}
        />
        <div>
          <p className="font-medium">{labels[state.kind]}</p>
          {state.kind === 'offline' && (
            <p className="text-sm text-muted-foreground">{state.reason}</p>
          )}
        </div>
      </div>
      <Button
        size="lg"
        variant="outline"
        className="h-11 w-full px-5 sm:w-auto"
        disabled={state.kind === 'checking'}
        onClick={() => {
          setState({ kind: 'checking' });
          setAttempt((n) => n + 1);
        }}
      >
        Check again
      </Button>
    </section>
  );
}
