export type ProbeResult = {
  data: unknown;
  error: null | RequestFailure;
  isFetching: boolean;
  isSuccess: boolean;
};

export type RequestFailure = {
  code?: string | undefined;
  response?: undefined | { status: number };
};

export type Status =
  | { api: 'checking'; database: 'checking' }
  | { api: 'offline'; database: 'unknown'; reason: string }
  | { api: 'online'; database: 'online' | 'unavailable' };

export type StatusState = Status['api'] | Status['database'];
