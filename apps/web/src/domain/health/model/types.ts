export type JsonResult =
  { body: unknown; ok: true } | { ok: false; reason: string };

export type Status =
  | { api: 'checking'; database: 'checking' }
  | { api: 'online'; database: 'online' | 'unavailable' }
  | { api: 'offline'; database: 'unknown'; reason: string };

export type StatusState = Status['api'] | Status['database'];
