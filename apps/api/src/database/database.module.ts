import {
  type DynamicModule,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/** Injection token for the Drizzle database: `@Inject(DATABASE) db: Database`. */
export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase;

const DATABASE_POOL = Symbol('DATABASE_POOL');

export interface DatabaseOptions {
  url: string;
}

@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: DATABASE_POOL,
          // Lazy: no connection is opened until the first query.
          useFactory: (): Pool => {
            const pool = new Pool({ connectionString: options.url });
            // An idle client error (e.g. DB restart) must not crash the process.
            pool.on('error', (error) => {
              new Logger(DatabaseModule.name).error(
                `Idle database client error: ${error.message}`,
              );
            });
            return pool;
          },
        },
        {
          provide: DATABASE,
          inject: [DATABASE_POOL],
          useFactory: (pool: Pool): Database => drizzle({ client: pool }),
        },
      ],
      exports: [DATABASE],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
