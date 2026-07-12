import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    connect_timeout: 15,
  });

  try {
    const cols = await sql`
      select column_name from information_schema.columns
      where table_schema='public' and table_name='orders'
      order by ordinal_position
    `;
    console.log(
      "orders cols:",
      cols.map((c) => c.column_name).join(", ")
    );

    const file = resolve("drizzle/0002_admin_align.sql");
    const raw = readFileSync(file, "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n[${i + 1}/${statements.length}] running...`);
      try {
        await sql.unsafe(stmt);
        console.log("ok");
      } catch (err) {
        console.error("FAILED:", err);
        throw err;
      }
    }

    // Mark migration applied if drizzle table exists
    try {
      await sql`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values ('0002_admin_align', ${Date.now()})
        on conflict do nothing
      `;
    } catch {
      console.log("Could not mark drizzle migration (ok if using custom apply)");
    }

    console.log("\nMigration complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
