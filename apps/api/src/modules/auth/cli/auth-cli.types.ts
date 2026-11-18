import type { Database } from '#infrastructure/database/database.module.js';
import type { Auth } from '../integrations/better-auth/config/better-auth.config.js';

export interface AuthCliDependencies {
  auth: Auth;
  db: Database;
  io: CliIo;
}

export interface CliIo {
  ask(question: string): Promise<string>;
  askSecret(question: string): Promise<string>;
  error(message: string): void;
  print(message: string): void;
}
