import { authClient } from '../config/auth-client';

export function useSessionUserId(): string | undefined {
  return authClient.useSession().data?.user.id;
}
