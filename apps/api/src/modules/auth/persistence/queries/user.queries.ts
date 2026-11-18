import { eq } from 'drizzle-orm';
import type { Database } from '#infrastructure/database/database.module.js';
import { user } from '../schemas/auth.schema.js';

export async function isEmailRegistered(
  db: Database,
  email: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  return existing !== undefined;
}
