import { getKanaProgressOptions } from '@shiori/api-client/react-query';
import type { KanaScript } from '@shiori/kana';
import {
  type QueryClient,
  queryOptions,
  skipToken,
} from '@tanstack/react-query';

export function invalidateKanaProgress(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: [{ _id: 'getKanaProgress' }],
  });
}

export function kanaProgressQuery(script: KanaScript) {
  const options = getKanaProgressOptions({ query: { script } });
  return queryOptions({
    ...options,
    // WORKAROUND(@shiori/api-client): Built without exactOptionalPropertyTypes because the generated Hey API runtime fails with it, so `queryFn` is emitted optional and `useQuery` rejects it; remove once the generator's output compiles with the flag.
    queryFn: options.queryFn ?? skipToken,
  });
}
