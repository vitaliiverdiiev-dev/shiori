import { QueryClient } from '@tanstack/react-query';
import { subscribeToSessionUser } from '@/domain/auth';
import { isPublicQuery } from '@/shared/api/query-access';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

subscribeToSessionUser(() => {
  queryClient.removeQueries({ predicate: (query) => !isPublicQuery(query) });
});
