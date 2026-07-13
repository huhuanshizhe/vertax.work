import "dotenv/config";
import { config } from "dotenv";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { createId } from "../src/lib/ids";
import {
  LICENSE_PERIODS,
  PAID_MODULES,
  buildDefaultPriceMatrix,
} from "../src/lib/pricing";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const email = "admin@vertax.local";
  const password = "Admin123456";
  const passwordHash = await hash(password, 10);

  const [existing] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.email, email))
    .limit(1);

  if (existing) {
    console.log("Admin already exists:", email);
  } else {
    await db.insert(schema.admins).values({
      id: createId("adm"),
      email,
      passwordHash,
      name: "VertaX Admin",
    });
    console.log("Seeded admin:", email);
  }

  const [settings] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.id, "default"))
    .limit(1);
  if (!settings) {
    await db.insert(schema.siteSettings).values({
      id: "default",
      paymentSandboxMode: true,
      updatedAt: new Date(),
    });
    console.log("Seeded site_settings default (sandbox on)");
  }

  const existingPrices = await db.select().from(schema.licensePrices);
  if (existingPrices.length === 0) {
    const matrix = buildDefaultPriceMatrix();
    const now = new Date();
    for (const mod of PAID_MODULES) {
      for (const period of LICENSE_PERIODS) {
        await db.insert(schema.licensePrices).values({
          id: createId("lpr"),
          module: mod,
          period,
          amountCents: matrix[mod][period],
          autoFromMonthly: period !== "month",
          updatedAt: now,
        });
      }
    }
    console.log("Seeded default license prices");
  }

  console.log("Admin login:", `${email} / ${password}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
