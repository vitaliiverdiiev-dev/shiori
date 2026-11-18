import { authClient } from '../config/auth-client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readUserId(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.data)) return undefined;
  const { user } = value.data;
  return isRecord(user) && typeof user.id === 'string' ? user.id : undefined;
}

export function subscribeToSessionUser(
  onChange: (userId: string | undefined) => void,
): () => void {
  const session = authClient.$store.atoms.session;
  if (!session) throw new Error('Better Auth session store is missing');

  let current = readUserId(session.get());
  return session.listen((value: unknown) => {
    const next = readUserId(value);
    if (next === current) return;
    current = next;
    onChange(next);
  });
}
