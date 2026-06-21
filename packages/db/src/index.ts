import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export * from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let _pool: pg.Pool | null = null;
let _db: Database | null = null;

export function createDb(url?: string): Database {
  const pool = new pg.Pool({
    connectionString: url ?? process.env.DATABASE_URL,
    max: 10,
  });
  return drizzle(pool, { schema });
}

export function getDb(): Database {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
