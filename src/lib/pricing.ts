export type PaidModule = "radar" | "social" | "growth";
export type LicensePeriod = "month" | "quarter" | "half" | "year";

/** Monthly price in fen (分). 1.98 yuan = 198 fen */
export const MODULE_MONTHLY_CENTS: Record<PaidModule, number> = {
  radar: 198,
  social: 198,
  growth: 98,
};

export const MODULE_LABELS: Record<PaidModule, string> = {
  radar: "获客雷达",
  social: "社媒营销",
  growth: "增长系统",
};

export const MODULE_DESCRIPTIONS: Record<PaidModule, string> = {
  radar: "ICP 画像驱动的主动客户发现与线索分层",
  social: "多平台内容分发、账号授权与互动沉淀",
  growth: "SEO / AEO / GEO 内容增长与官网推送",
};

export const PERIOD_MONTHS: Record<LicensePeriod, number> = {
  month: 1,
  quarter: 3,
  half: 6,
  year: 12,
};

export const PERIOD_LABELS: Record<LicensePeriod, string> = {
  month: "1 月",
  quarter: "1 季",
  half: "半年",
  year: "1 年",
};

export const DEFAULT_MONTHLY_LEADS_LIMIT = 500;

export const PAID_MODULES: PaidModule[] = ["radar", "social", "growth"];
export const LICENSE_PERIODS: LicensePeriod[] = [
  "month",
  "quarter",
  "half",
  "year",
];

export function isPaidModule(value: string): value is PaidModule {
  return PAID_MODULES.includes(value as PaidModule);
}

export function isLicensePeriod(value: string): value is LicensePeriod {
  return LICENSE_PERIODS.includes(value as LicensePeriod);
}

export function calcOrderAmountCents(
  modules: PaidModule[],
  period: LicensePeriod
): number {
  const unique = [...new Set(modules)];
  const months = PERIOD_MONTHS[period];
  return unique.reduce(
    (sum, mod) => sum + MODULE_MONTHLY_CENTS[mod] * months,
    0
  );
}

export function formatYuanFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
