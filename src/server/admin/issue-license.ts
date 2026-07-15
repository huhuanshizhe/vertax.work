import {
  assertExpiryAtLeastTomorrow,
  computeExpiryDate,
  dateInputToIso,
  isLicensePeriod,
  parseMonthlyLeadsLimitInput,
  parseUsageLimitMonthsInput,
  type LicensePeriod,
  UNLIMITED_USAGE_LIMIT_MONTHS,
} from "@/lib/license/duration";
import {
  signLicensePayload,
  verifyLicenseCodeWithConfig,
  type LicensePayload,
} from "@/lib/license/crypto";
import {
  isLicenseIssueType,
  type LicenseIssueType,
} from "@/lib/license/usage";

export type IssueLicenseInput = {
  /** Bound vertax.work user id (written into payload.ext.user_id). */
  userId: string;
  /** customer | order — written into payload.ext.license_type */
  licenseType: LicenseIssueType;
  /** DB row id — written into payload.ext.license_id */
  licenseId: string;
  customerName: string;
  modules: string[];
  period: string;
  expiresAt?: string;
  monthlyLeadsLimit?: number | string | null;
  usageLimitMonths?: number | string | null;
};

export type IssueLicenseResult = {
  code: string;
  expiresAtIso: string;
  monthlyLeadsLimit: number;
  usageLimitMonths: number;
  usageExpiresAtIso: string | null;
  modules: string[];
  period: LicensePeriod;
  payload: LicensePayload;
};

/** Shared VERTAX1 signing used by order fulfillment and customer licenses. */
export function issueLicenseCode(
  input: IssueLicenseInput
): IssueLicenseResult {
  const userId = String(input.userId || "").trim();
  if (!userId) {
    throw new Error("缺少所属用户 ID，无法签发授权码");
  }
  const licenseId = String(input.licenseId || "").trim();
  if (!licenseId) {
    throw new Error("缺少授权码 ID，无法签发授权码");
  }
  if (!isLicenseIssueType(input.licenseType)) {
    throw new Error("无效授权码类型");
  }
  if (!isLicensePeriod(input.period)) {
    throw new Error("无效授权时长");
  }
  if (!input.modules?.length) {
    throw new Error("请至少选择一个开通模块");
  }

  const period = input.period;
  const dateOnly = computeExpiryDate(period, input.expiresAt);
  assertExpiryAtLeastTomorrow(dateOnly);
  const expiresAtIso = dateInputToIso(dateOnly);
  const monthlyLeadsLimit = parseMonthlyLeadsLimitInput(
    input.monthlyLeadsLimit
  );
  const usageLimitMonths = parseUsageLimitMonthsInput(input.usageLimitMonths);

  const code = signLicensePayload(
    input.customerName,
    input.modules,
    period,
    expiresAtIso,
    monthlyLeadsLimit,
    usageLimitMonths,
    {
      user_id: userId,
      license_type: input.licenseType,
      license_id: licenseId,
    }
  );
  const payload = verifyLicenseCodeWithConfig(code);

  return {
    code,
    expiresAtIso,
    monthlyLeadsLimit,
    usageLimitMonths,
    usageExpiresAtIso: payload.usage_expires_at ?? null,
    modules: payload.modules,
    period,
    payload,
  };
}

export function customerDisplayName(user: {
  company: string | null;
  name: string;
  email: string;
}) {
  return (
    (user.company || "").trim() ||
    (user.name || "").trim() ||
    (user.email || "").trim()
  );
}

export { UNLIMITED_USAGE_LIMIT_MONTHS };
