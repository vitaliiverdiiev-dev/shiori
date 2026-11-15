import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  createInvitation,
  hashInvitationCode,
  listInvitations,
  revokeInvitation,
} from '../src/modules/auth/invitations.js';
import { testDatabaseUrl } from './support/test-database.js';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-11-15T12:00:00.000Z');

const pool = new Pool({ connectionString: testDatabaseUrl() });
const db = drizzle({ client: pool });

async function created(email: string, now = NOW) {
  const result = await createInvitation(db, email, now);
  if (!result.ok)
    throw new Error(`expected an invitation, got ${result.reason}`);
  return result;
}

async function invitationRows() {
  const { rows } = await pool.query<Record<string, unknown>>(
    'select * from invitation',
  );
  return rows;
}

afterEach(async () => {
  await pool.query(
    'truncate "user", verification, invitation, admin_bootstrap cascade',
  );
});

afterAll(async () => {
  await pool.end();
});

describe('createInvitation', () => {
  it('returns a high-entropy code once and stores only its hash', async () => {
    const { code, invitation } = await created('bob@example.test');

    expect(code).toMatch(/^[\w-]{43}$/);
    const [row] = await invitationRows();
    expect(row).toMatchObject({
      id: invitation.id,
      code_hash: hashInvitationCode(code),
      email: 'bob@example.test',
    });
    expect(JSON.stringify(row)).not.toContain(code);
  });

  it('issues a different code every time', async () => {
    const first = await created('bob@example.test');
    const second = await created('bob@example.test');
    expect(first.code).not.toBe(second.code);
  });

  it('normalizes the email and expires seven days after creation', async () => {
    const { invitation } = await created('  Bob@Example.TEST ');
    expect(invitation).toMatchObject({
      createdAt: NOW,
      email: 'bob@example.test',
      expiresAt: new Date(NOW.getTime() + 7 * DAY_MS),
      status: 'active',
    });
  });

  it('rejects an invalid email', async () => {
    expect(await createInvitation(db, 'not an email', NOW)).toEqual({
      ok: false,
      reason: 'invalid-email',
    });
    expect(await invitationRows()).toEqual([]);
  });

  it('rejects an email that already has an account', async () => {
    await pool.query(
      "insert into \"user\" (id, email, name) values ('u1', 'bob@example.test', 'Bob')",
    );
    expect(await createInvitation(db, 'BOB@example.test', NOW)).toEqual({
      ok: false,
      reason: 'email-taken',
    });
  });
});

describe('listInvitations', () => {
  it('reports each status and never exposes codes or hashes', async () => {
    const active = await created('active@example.test');
    const expired = await created(
      'expired@example.test',
      new Date(NOW.getTime() - 8 * DAY_MS),
    );
    const revoked = await created('revoked@example.test');
    const used = await created('used@example.test');
    await revokeInvitation(db, revoked.invitation.id, NOW);
    await pool.query('update invitation set used_at = $1 where id = $2', [
      NOW,
      used.invitation.id,
    ]);

    const listed = await listInvitations(db, NOW);

    expect(
      Object.fromEntries(listed.map(({ email, status }) => [email, status])),
    ).toEqual({
      'active@example.test': 'active',
      'expired@example.test': 'expired',
      'revoked@example.test': 'revoked',
      'used@example.test': 'used',
    });
    for (const invitation of listed) {
      expect(Object.keys(invitation).sort()).toEqual([
        'createdAt',
        'email',
        'expiresAt',
        'id',
        'status',
      ]);
    }
    const serialized = JSON.stringify(listed);
    for (const { code } of [active, expired, revoked, used]) {
      expect(serialized).not.toContain(code);
      expect(serialized).not.toContain(hashInvitationCode(code));
    }
  });
});

describe('revokeInvitation', () => {
  it('revokes an active invitation exactly once', async () => {
    const { invitation } = await created('bob@example.test');
    expect(await revokeInvitation(db, invitation.id, NOW)).toBe(true);
    expect(await revokeInvitation(db, invitation.id, NOW)).toBe(false);
  });

  it('does not revoke a used or unknown invitation', async () => {
    const { invitation } = await created('bob@example.test');
    await pool.query('update invitation set used_at = now() where id = $1', [
      invitation.id,
    ]);
    expect(await revokeInvitation(db, invitation.id, NOW)).toBe(false);
    expect(await revokeInvitation(db, 'missing', NOW)).toBe(false);
  });
});

describe('invitation table constraints', () => {
  it('rejects a non-normalized email', async () => {
    await expect(
      pool.query(
        "insert into invitation (id, email, code_hash, expires_at) values ('i1', 'Bob@example.test', 'h', now() + interval '1 day')",
      ),
    ).rejects.toThrow(/invitation_email_normalized/);
  });

  it('rejects an invitation that is both used and revoked', async () => {
    const { invitation } = await created('bob@example.test');
    await expect(
      pool.query(
        'update invitation set used_at = now(), revoked_at = now() where id = $1',
        [invitation.id],
      ),
    ).rejects.toThrow(/invitation_single_outcome/);
  });

  it('rejects a reused code hash', async () => {
    await pool.query(
      "insert into invitation (id, email, code_hash, expires_at) values ('i1', 'a@example.test', 'same', now() + interval '1 day')",
    );
    await expect(
      pool.query(
        "insert into invitation (id, email, code_hash, expires_at) values ('i2', 'b@example.test', 'same', now() + interval '1 day')",
      ),
    ).rejects.toThrow(/code_hash/);
  });
});

describe('user email', () => {
  it('must be stored lower-case', async () => {
    await expect(
      pool.query(
        "insert into \"user\" (id, email, name) values ('u1', 'Bob@example.test', 'Bob')",
      ),
    ).rejects.toThrow(/user_email_lowercase/);
  });
});
