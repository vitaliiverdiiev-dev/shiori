import { existsSync } from 'node:fs';
import { z } from 'zod';
import { isLocalUrl } from '../database/local-url.js';

const DEFAULT_PORT = 3_000;
const MAX_PORT = 65_535;
const MIN_AUTH_SECRET_LENGTH = 32;

/** The fake secret shipped in `.env.example`; acceptable only on this machine. */
export const EXAMPLE_AUTH_SECRET =
  'local-dev-only-better-auth-secret-change-me';

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

// Server/deployment config only; public product identity stays in product.config.json.
const envSchema = databaseEnvSchema
  .extend({
    BETTER_AUTH_SECRET: z.string().min(MIN_AUTH_SECRET_LENGTH),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
    PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
    // `open` needs verified email delivery, which does not exist yet, so it is
    // rejected below.
    REGISTRATION_MODE: z.enum(['closed', 'open']).default('closed'),
  })
  .superRefine((env, ctx) => {
    if (env.REGISTRATION_MODE === 'open') {
      ctx.addIssue({
        code: 'custom',
        message: 'open registration requires email verification',
        path: ['REGISTRATION_MODE'],
      });
    }
    if (isLocalUrl(env.BETTER_AUTH_URL)) return;
    if (new URL(env.BETTER_AUTH_URL).protocol !== 'https:') {
      ctx.addIssue({
        code: 'custom',
        message: 'a non-local URL must use https',
        path: ['BETTER_AUTH_URL'],
      });
    }
    if (env.BETTER_AUTH_SECRET === EXAMPLE_AUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        message: 'the example secret is for local development only',
        path: ['BETTER_AUTH_SECRET'],
      });
    }
  });

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type Env = z.infer<typeof envSchema>;

/** Repo-root `.env` (shared with Docker Compose); same depth from src/ and dist/. */
const rootEnvFile = new URL('../../../../../.env', import.meta.url);

/** Only what migrations and Drizzle Kit need. */
export function loadDatabaseEnv(
  source: NodeJS.ProcessEnv = process.env,
): DatabaseEnv {
  return parse(databaseEnvSchema, source);
}

/** Validates server config. Errors name the offending variables and rules, never their values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return parse(envSchema, source);
}

/** Loads the local `.env` if present; variables already set in the environment win. */
export function loadRootEnvFile(): void {
  if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);
}

function parse<T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const problems = [
    ...new Set(
      result.error.issues.map((issue) => {
        const name = issue.path.join('.');
        return issue.code === 'custom' ? `${name} (${issue.message})` : name;
      }),
    ),
  ];
  throw new Error(
    `Invalid or missing environment variables: ${problems.join(', ')}. See .env.example.`,
  );
}
