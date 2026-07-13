export const LICENSE_PERIODS = [
  "month",
  "quarter",
  "half",
  "year",
  "custom",
] as const;
export type LicensePeriod = (typeof LICENSE_PERIODS)[number];

export const UNLIMITED_MONTHLY_LEADS_LIMIT = -1;

/** 授权码使用时限不限制 */
export const UNLIMITED_USAGE_LIMIT_MONTHS = -1;

/** 站点默认：签发后 1 个月内可使用 */
export const DEFAULT_LICENSE_USAGE_LIMIT_MONTHS = 1;

export function parseMonthlyLeadsLimitInput(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return UNLIMITED_MONTHLY_LEADS_LIMIT;
  }
  const limit = Number(value);
  if (!Number.isInteger(limit)) {
    throw new Error("每月获客数量上限须为整数");
  }
  if (limit === UNLIMITED_MONTHLY_LEADS_LIMIT) return limit;
  if (limit < 1) {
    throw new Error("不可填写 0 或负数；不填表示不限制");
  }
  return limit;
}

/** 空 / null → 不限制；正整数 → 月数；-1 → 不限制 */
export function parseUsageLimitMonthsInput(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return UNLIMITED_USAGE_LIMIT_MONTHS;
  }
  const months = Number(value);
  if (!Number.isInteger(months)) {
    throw new Error("授权码验证时限须为整数月");
  }
  if (months === UNLIMITED_USAGE_LIMIT_MONTHS) return months;
  if (months < 1) {
    throw new Error("验证时限不可为 0 或负数；不填表示不限制");
  }
  return months;
}

/** 签发日 + N 月 → 当日 23:59:59 ISO；不限制返回 null */
export function computeUsageExpiresAtIso(
  issuedAt: Date,
  usageLimitMonths: number
): string | null {
  if (usageLimitMonths === UNLIMITED_USAGE_LIMIT_MONTHS) return null;
  const end = new Date(issuedAt);
  end.setMonth(end.getMonth() + usageLimitMonths);
  return dateInputToIso(toDateInputValue(end));
}

export function isLicensePeriod(value: string): value is LicensePeriod {
  return (LICENSE_PERIODS as readonly string[]).includes(value);
}

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export function addDuration(
  base: Date,
  period: Exclude<LicensePeriod, "custom">
): Date {
  const next = new Date(base);
  switch (period) {
    case "month":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarter":
      next.setMonth(next.getMonth() + 3);
      break;
    case "half":
      next.setMonth(next.getMonth() + 6);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export function computeExpiryDate(
  period: LicensePeriod,
  customDate?: string
): string {
  if (period === "custom") {
    if (!customDate) throw new Error("自定义授权需设置过期时间");
    return customDate;
  }
  return toDateInputValue(addDuration(startOfToday(), period));
}

export function dateInputToIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

export function assertExpiryAtLeastTomorrow(dateStr: string): void {
  const expiry = parseDateOnly(dateStr);
  const tomorrow = startOfTomorrow();
  if (expiry < tomorrow) {
    throw new Error("过期时间至少为明天");
  }
}
