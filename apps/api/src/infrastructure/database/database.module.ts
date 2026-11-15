import {
  type DynamicModule,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase & { $client: Pool };

const DATABASE_POOL = Symbol('DATABASE_POOL');
const CONNECTION_TIMEOUT_MS = 3_000;

export interface DatabaseOptions {
  url: string;
}

@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      exports: [DATABASE],
      global: true,
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_POOL,
          useFactory: (): Pool => createPool(options.url),
        },
        {
          inject: [DATABASE_POOL],
          provide: DATABASE,
          useFactory: (pool: Pool): Database => drizzle({ client: pool }),
        },
      ],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export function createPool(url: string): Pool {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  // COMPAT(pg@8.23): An unhandled idle-client 'error' event crashes the Node process.
  pool.on('error', (error) => {
    new Logger(DatabaseModule.name).error(
      `Idle database client error: ${error.message}`,
    );
  });
  return pool;
}
