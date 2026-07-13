import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { licensePrices } from "@/db/schema";
import { createId } from "@/lib/ids";
import {
  DEFAULT_PRICE_MATRIX,
  LICENSE_PERIODS,
  PAID_MODULES,
  PERIOD_MONTHS,
  buildDefaultPriceMatrix,
  calcOrderAmountCents,
  isLicensePeriod,
  isPaidModule,
  type LicensePeriod,
  type PaidModule,
  type PriceMatrix,
} from "@/lib/pricing";

/** module → period → 是否乘月数 */
export type AutoFromMonthlyMatrix = Record<
  PaidModule,
  Record<LicensePeriod, boolean>
>;

function emptyAutoMatrix(): AutoFromMonthlyMatrix {
  const matrix = {} as AutoFromMonthlyMatrix;
  for (const mod of PAID_MODULES) {
    matrix[mod] = {} as Record<LicensePeriod, boolean>;
    for (const period of LICENSE_PERIODS) {
      matrix[mod][period] = period !== "month";
    }
  }
  return matrix;
}

export async function ensureLicensePrices() {
  const existing = await db.select().from(licensePrices);
  if (existing.length >= PAID_MODULES.length * LICENSE_PERIODS.length) {
    return existing;
  }

  const defaults = buildDefaultPriceMatrix();
  const now = new Date();

  for (const mod of PAID_MODULES) {
    for (const period of LICENSE_PERIODS) {
      const found = existing.find(
        (row) => row.module === mod && row.period === period
      );
      if (found) continue;
      await db.insert(licensePrices).values({
        id: createId("lpr"),
        module: mod,
        period,
        amountCents: defaults[mod][period],
        autoFromMonthly: period !== "month",
        updatedAt: now,
      });
    }
  }

  return db.select().from(licensePrices);
}

export async function getPriceMatrix(): Promise<PriceMatrix> {
  const { matrix } = await getLicensePriceState();
  return matrix;
}

export async function getLicensePriceState(): Promise<{
  matrix: PriceMatrix;
  autoFromMonthly: AutoFromMonthlyMatrix;
}> {
  const rows = await ensureLicensePrices();
  const matrix = buildDefaultPriceMatrix();
  const autoFromMonthly = emptyAutoMatrix();

  for (const row of rows) {
    if (!isPaidModule(row.module) || !isLicensePeriod(row.period)) continue;
    matrix[row.module][row.period] = row.amountCents;
    autoFromMonthly[row.module][row.period] =
      row.period === "month" ? false : Boolean(row.autoFromMonthly);
  }

  // 勾选「乘月数」时，读库也按当前月价重算，保证一致
  for (const mod of PAID_MODULES) {
    const monthCents = matrix[mod].month;
    for (const period of LICENSE_PERIODS) {
      if (period === "month") continue;
      if (autoFromMonthly[mod][period]) {
        matrix[mod][period] = monthCents * PERIOD_MONTHS[period];
      }
    }
  }

  return { matrix, autoFromMonthly };
}

export async function calcOrderAmountFromDb(
  modules: PaidModule[],
  period: LicensePeriod
) {
  const matrix = await getPriceMatrix();
  return calcOrderAmountCents(modules, period, matrix);
}

export type LicensePriceUpdate = {
  module: PaidModule;
  period: LicensePeriod;
  amountCents: number;
  autoFromMonthly?: boolean;
};

export async function upsertLicensePrices(updates: LicensePriceUpdate[]) {
  await ensureLicensePrices();
  const now = new Date();

  for (const item of updates) {
    const auto =
      item.period === "month" ? false : Boolean(item.autoFromMonthly ?? true);

    const [existing] = await db
      .select()
      .from(licensePrices)
      .where(
        and(
          eq(licensePrices.module, item.module),
          eq(licensePrices.period, item.period)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(licensePrices)
        .set({
          amountCents: item.amountCents,
          autoFromMonthly: auto,
          updatedAt: now,
        })
        .where(eq(licensePrices.id, existing.id));
    } else {
      await db.insert(licensePrices).values({
        id: createId("lpr"),
        module: item.module,
        period: item.period,
        amountCents: item.amountCents,
        autoFromMonthly: auto,
        updatedAt: now,
      });
    }
  }

  // 再按最新月价刷新所有「乘月数」周期
  const state = await getLicensePriceState();
  for (const mod of PAID_MODULES) {
    const monthCents = state.matrix[mod].month;
    for (const period of LICENSE_PERIODS) {
      if (period === "month") continue;
      if (!state.autoFromMonthly[mod][period]) continue;
      const amountCents = monthCents * PERIOD_MONTHS[period];
      await db
        .update(licensePrices)
        .set({ amountCents, updatedAt: now })
        .where(
          and(
            eq(licensePrices.module, mod),
            eq(licensePrices.period, period)
          )
        );
    }
  }

  return getLicensePriceState();
}

export async function resetLicensePricesToDefault() {
  const defaults = DEFAULT_PRICE_MATRIX;
  const updates: LicensePriceUpdate[] = [];

  for (const mod of PAID_MODULES) {
    for (const period of LICENSE_PERIODS) {
      updates.push({
        module: mod,
        period,
        amountCents: defaults[mod][period],
        autoFromMonthly: period !== "month",
      });
    }
  }

  return upsertLicensePrices(updates);
}
