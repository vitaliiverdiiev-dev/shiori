export type JsonResult =
  { body: unknown; ok: true } | { ok: false; reason: string };

export type Status =
  | { api: 'checking'; database: 'checking' }
  | { api: 'online'; database: 'online' | 'unavailable' }
  // Without the API we cannot know the database state.
  | { api: 'offline'; database: 'unknown'; reason: string };

export type StatusState = Status['api'] | Status['database'];
