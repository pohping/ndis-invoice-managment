import { DB } from '@/db/schema';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

declare global {
   var __db__: Kysely<DB> | undefined;
}

function createDB() {
   return new Kysely<DB>({
      dialect: new PostgresDialect({
         pool: new Pool({
            connectionString: process.env.DATABASE_URL,
         }),
      }),
   });
}

export const db = global.__db__ ?? createDB();

if (process.env.NODE_ENV !== 'production') global.__db__ = db;
