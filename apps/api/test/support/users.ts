import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../src/modules/auth/integrations/better-auth/config/better-auth.config.js';

export interface TestUser {
  email: string;
  name: string;
  password: string;
}

export const ALICE: TestUser = {
  email: 'alice@example.test',
  name: 'Alice Test',
  password: 'correct horse battery staple',
};

export async function createUser(auth: Auth, user: TestUser): Promise<string> {
  const context = await auth.$context;
  const created = await context.internalAdapter.createUser(
    { email: user.email, emailVerified: false, name: user.name },
    { method: 'email-password' },
  );
  await context.internalAdapter.linkAccount({
    accountId: created.id,
    password: await context.password.hash(user.password),
    providerId: 'credential',
    userId: created.id,
  });
  return created.id;
}

export function getAuth(app: INestApplication): Auth {
  return app.get<AuthService<Auth>>(AuthService, { strict: false }).instance;
}
