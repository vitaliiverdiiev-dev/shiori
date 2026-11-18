import {
  getHealthOptions,
  getReadyOptions,
} from '@shiori/api-client/react-query';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { PUBLIC_QUERY_META } from '@/shared/api/query-access';
import { HEALTH_TIMEOUT_MS, READY_TIMEOUT_MS } from '../model/consts';

const health = getHealthOptions({ timeout: HEALTH_TIMEOUT_MS });
const readiness = getReadyOptions({ timeout: READY_TIMEOUT_MS });

export const healthQuery = queryOptions({
  ...health,
  meta: PUBLIC_QUERY_META,
  // WORKAROUND(@shiori/api-client): Built without exactOptionalPropertyTypes because the generated Hey API runtime fails with it, so `queryFn` is emitted optional and `useQuery` rejects it; remove once the generator's output compiles with the flag.
  queryFn: health.queryFn ?? skipToken,
});

export const readinessQuery = queryOptions({
  ...readiness,
  meta: PUBLIC_QUERY_META,
  queryFn: readiness.queryFn ?? skipToken,
});
