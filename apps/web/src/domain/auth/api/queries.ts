import { getRegistrationOptions } from '@shiori/api-client/react-query';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { PUBLIC_QUERY_META } from '@/shared/api/query-access';

const registration = getRegistrationOptions();

export const registrationQuery = queryOptions({
  ...registration,
  meta: PUBLIC_QUERY_META,
  // WORKAROUND(@shiori/api-client): Built without exactOptionalPropertyTypes because the generated Hey API runtime fails with it, so `queryFn` is emitted optional and `useQuery` rejects it; remove once the generator's output compiles with the flag.
  queryFn: registration.queryFn ?? skipToken,
});
