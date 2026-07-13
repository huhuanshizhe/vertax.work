export type PaidModule = "radar" | "social" | "growth";
export type LicensePeriod = "month" | "quarter" | "half" | "year";

/** Monthly base price in fen (分). Used to derive default matrix. */
export const MODULE_MONTHLY_CENTS: Record<PaidModule, number> = {
  radar: 1980_00,
  social: 1980_00,
  growth: 980_00,
};

export const MODULE_LABELS: Record<PaidModule, string> = {
  radar: "获客雷达",
  social: "社媒营销",
  growth: "内容增长",
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

export type PriceMatrix = Record<
  PaidModule,
  Record<LicensePeriod, number>
>;

/** Default prices: monthly × months for each period. */
export function buildDefaultPriceMatrix(): PriceMatrix {
  const matrix = {} as PriceMatrix;
  for (const mod of PAID_MODULES) {
    matrix[mod] = {} as Record<LicensePeriod, number>;
    for (const period of LICENSE_PERIODS) {
      matrix[mod][period] =
        MODULE_MONTHLY_CENTS[mod] * PERIOD_MONTHS[period];
    }
  }
  return matrix;
}

export const DEFAULT_PRICE_MATRIX = buildDefaultPriceMatrix();

export function isPaidModule(value: string): value is PaidModule {
  return PAID_MODULES.includes(value as PaidModule);
}

export function isLicensePeriod(value: string): value is LicensePeriod {
  return LICENSE_PERIODS.includes(value as LicensePeriod);
}

/** Fallback calculator using in-code defaults (or provided matrix). */
export function calcOrderAmountCents(
  modules: PaidModule[],
  period: LicensePeriod,
  matrix: PriceMatrix = DEFAULT_PRICE_MATRIX
): number {
  const unique = [...new Set(modules)];
  return unique.reduce((sum, mod) => sum + (matrix[mod]?.[period] ?? 0), 0);
}

export function formatYuanFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

export function centsToYuanNumber(cents: number): number {
  return cents / 100;
}
