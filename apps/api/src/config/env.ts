import { existsSync } from 'node:fs';
import { z } from 'zod';

// Server/deployment config only; public product identity stays in product.config.json.
const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

/** Repo-root `.env` (shared with Docker Compose); same depth from src/ and dist/. */
const rootEnvFile = new URL('../../../../.env', import.meta.url);

/** Loads the local `.env` if present; variables already set in the environment win. */
export function loadRootEnvFile(): void {
  if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);
}

/** Validates server config. Errors name the offending variables, never their values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(
      `Invalid or missing environment variables: ${names.join(', ')}. See .env.example.`,
    );
  }
  return result.data;
}
