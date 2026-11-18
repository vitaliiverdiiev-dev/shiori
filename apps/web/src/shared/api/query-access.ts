export const PUBLIC_QUERY_META = { access: 'public' } as const;

export function isPublicQuery(query: {
  meta?: Record<string, unknown> | undefined;
}): boolean {
  return query.meta?.access === PUBLIC_QUERY_META.access;
}
