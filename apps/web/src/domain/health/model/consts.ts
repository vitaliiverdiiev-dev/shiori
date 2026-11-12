import type { Status, StatusState } from './types';

export const HEALTH_PATH = '/api/health';
export const READY_PATH = '/api/ready';
export const HEALTH_TIMEOUT_MS = 5_000;
// The API bounds its own DB check (~5 s worst case); allow a little more.
export const READY_TIMEOUT_MS = 8_000;

export const CHECKING: Status = { api: 'checking', database: 'checking' };

export const apiText = {
  checking: 'Checking API…',
  offline: 'API offline',
  online: 'API online',
} as const satisfies Record<Status['api'], string>;

export const databaseText = {
  checking: 'Checking database…',
  online: 'Database online',
  unavailable: 'Database unavailable',
  unknown: 'Database unknown',
} as const satisfies Record<Status['database'], string>;

export const dotColors = {
  checking: 'bg-muted-foreground animate-pulse',
  offline: 'bg-destructive',
  online: 'bg-success',
  unavailable: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
} as const satisfies Record<StatusState, string>;
