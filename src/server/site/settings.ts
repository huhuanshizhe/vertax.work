import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { DEFAULT_MONTHLY_LEADS_LIMIT } from "@/lib/pricing";

export type PaymentMode = "test" | "live";

export async function ensureSiteSettings() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, "default"))
    .limit(1);

  if (row) return row;

  const [created] = await db
    .insert(siteSettings)
    .values({
      id: "default",
      paymentSandboxMode: true,
      radarMonthlyLeadsLimit: DEFAULT_MONTHLY_LEADS_LIMIT,
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function getSiteSettings() {
  return ensureSiteSettings();
}

export async function getRadarMonthlyLeadsLimit() {
  const settings = await getSiteSettings();
  return settings.radarMonthlyLeadsLimit ?? DEFAULT_MONTHLY_LEADS_LIMIT;
}

export async function updateSiteSettings(input: {
  paymentSandboxMode?: boolean;
  radarMonthlyLeadsLimit?: number;
}) {
  await ensureSiteSettings();
  const patch: {
    paymentSandboxMode?: boolean;
    radarMonthlyLeadsLimit?: number;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (typeof input.paymentSandboxMode === "boolean") {
    patch.paymentSandboxMode = input.paymentSandboxMode;
  }
  if (typeof input.radarMonthlyLeadsLimit === "number") {
    patch.radarMonthlyLeadsLimit = Math.max(
      1,
      Math.floor(input.radarMonthlyLeadsLimit)
    );
  }

  const [updated] = await db
    .update(siteSettings)
    .set(patch)
    .where(eq(siteSettings.id, "default"))
    .returning();
  return updated;
}

export async function resolvePaymentSandboxMode() {
  const settings = await getSiteSettings();
  return settings.paymentSandboxMode;
}

export async function resolvePaymentMode(): Promise<PaymentMode> {
  const sandbox = await resolvePaymentSandboxMode();
  return sandbox ? "test" : "live";
}
