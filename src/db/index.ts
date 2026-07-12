import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __vertaxDb?: Db;
  __vertaxSql?: ReturnType<typeof postgres>;
};

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client =
    globalForDb.__vertaxSql ??
    postgres(connectionString, { prepare: false, max: 1 });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__vertaxSql = client;
  }

  return drizzle(client, { schema });
}

export const db: Db =
  globalForDb.__vertaxDb ?? (globalForDb.__vertaxDb = createDb());
