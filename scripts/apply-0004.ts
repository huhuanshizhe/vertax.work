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
    const file = resolve("drizzle/0004_license_price_auto.sql");
    const raw = readFileSync(file, "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (let i = 0; i < statements.length; i++) {
      console.log(`\n[${i + 1}/${statements.length}] running...`);
      await sql.unsafe(statements[i]);
      console.log("ok");
    }
    console.log("\nMigration 0004 complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
