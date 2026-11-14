import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../src/modules/auth/auth.config.js';

export interface TestUser {
  email: string;
  name: string;
  password: string;
}

/** Fake credentials, created only in the isolated *_test database. */
export const ALICE: TestUser = {
  email: 'alice@example.test',
  name: 'Alice Test',
  password: 'correct horse battery staple',
};

export function authOf(app: INestApplication): Auth {
  return app.get<AuthService<Auth>>(AuthService, { strict: false }).instance;
}

/** Creates a credential user the way sign-up would, bypassing the closed sign-up endpoint. */
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
