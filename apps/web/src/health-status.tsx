import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Status =
  | { api: 'checking'; database: 'checking' }
  | { api: 'online'; database: 'online' | 'unavailable' }
  // Without the API we cannot know the database state.
  | { api: 'offline'; database: 'unknown'; reason: string };

const HEALTH_TIMEOUT_MS = 5_000;
// The API bounds its own DB check (~5 s worst case); allow a little more.
const READY_TIMEOUT_MS = 8_000;

type JsonResult = { ok: true; body: unknown } | { ok: false; reason: string };

async function getJson(path: string, timeoutMs: number): Promise<JsonResult> {
  try {
    const response = await fetch(path, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, reason: `responded ${String(response.status)}` };
    }
    const body: unknown = await response.json();
    return { ok: true, body };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      reason: timedOut ? 'did not respond in time' : 'is unreachable',
    };
  }
}

function isOk(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ok'
  );
}

async function requestStatus(): Promise<Status> {
  const health = await getJson('/api/health', HEALTH_TIMEOUT_MS);
  if (!health.ok) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: `API ${health.reason}`,
    };
  }
  if (!isOk(health.body)) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: 'Unexpected health response',
    };
  }
  const ready = await getJson('/api/ready', READY_TIMEOUT_MS);
  return {
    api: 'online',
    database: ready.ok && isOk(ready.body) ? 'online' : 'unavailable',
  };
}

// Shared in-flight check: StrictMode's dev remount and concurrent callers
// reuse it instead of firing (and cancelling) duplicate requests.
let inFlight: Promise<Status> | undefined;

function checkStatus(): Promise<Status> {
  inFlight ??= requestStatus().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

const apiText = {
  checking: 'Checking API…',
  online: 'API online',
  offline: 'API offline',
} as const;

const databaseText = {
  checking: 'Checking database…',
  online: 'Database online',
  unavailable: 'Database unavailable',
  unknown: 'Database unknown',
} as const;

const dotColors = {
  checking: 'bg-muted-foreground animate-pulse',
  online: 'bg-success',
  offline: 'bg-destructive',
  unavailable: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
} as const;

function StatusRow({
  state,
  text,
  detail,
}: {
  state: keyof typeof dotColors;
  text: string;
  detail?: string | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotColors[state]}`}
      />
      <div>
        <p className="font-medium">{text}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

const CHECKING: Status = { api: 'checking', database: 'checking' };

export function HealthStatus() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>(CHECKING);

  useEffect(() => {
    let active = true;
    void checkStatus().then((next) => {
      if (active) setStatus(next);
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
      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        <StatusRow
          state={status.api}
          text={apiText[status.api]}
          detail={status.api === 'offline' ? status.reason : undefined}
        />
        <StatusRow
          state={status.database}
          text={databaseText[status.database]}
        />
      </div>
      <Button
        size="lg"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={status.api === 'checking'}
        onClick={() => {
          setStatus(CHECKING);
          setAttempt((n) => n + 1);
        }}
      >
        Check again
      </Button>
    </section>
  );
}
