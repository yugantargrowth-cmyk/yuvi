import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as pg.Pool);

export const db = pool
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export function getDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. Please provide DATABASE_URL in environment variables to connect to PostgreSQL/Supabase.",
    );
  }
  return db;
}

export * from "./schema";
