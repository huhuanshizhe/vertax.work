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
    const file = resolve("drizzle/0005_radar_leads_limit.sql");
    const raw = readFileSync(file, "utf8");
    console.log("running 0005...");
    await sql.unsafe(raw.trim());
    console.log("Migration 0005 complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
