import type { Status } from './types';

export const HEALTH_TIMEOUT_MS = 5_000;
export const READY_TIMEOUT_MS = 8_000;

const BAD_GATEWAY_STATUS = 502;
const SERVICE_UNAVAILABLE_STATUS = 503;
const GATEWAY_TIMEOUT_STATUS = 504;
export const GATEWAY_ERROR_STATUSES: readonly number[] = [
  BAD_GATEWAY_STATUS,
  SERVICE_UNAVAILABLE_STATUS,
  GATEWAY_TIMEOUT_STATUS,
];

export const TIMEOUT_ERROR_CODES: readonly string[] = [
  'ECONNABORTED',
  'ETIMEDOUT',
];

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
