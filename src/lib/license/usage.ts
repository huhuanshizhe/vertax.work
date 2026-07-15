export const LICENSE_USAGE_UNUSED = "unused" as const;
export const LICENSE_USAGE_USED = "used" as const;

export type LicenseUsageStatus =
  | typeof LICENSE_USAGE_UNUSED
  | typeof LICENSE_USAGE_USED;

export const LICENSE_TYPE_CUSTOMER = "customer" as const;
export const LICENSE_TYPE_ORDER = "order" as const;

export type LicenseIssueType =
  | typeof LICENSE_TYPE_CUSTOMER
  | typeof LICENSE_TYPE_ORDER;

export function isLicenseIssueType(value: string): value is LicenseIssueType {
  return value === LICENSE_TYPE_CUSTOMER || value === LICENSE_TYPE_ORDER;
}

export function licenseUsageStatusLabel(status: string | null | undefined): string {
  return status === LICENSE_USAGE_USED ? "已使用" : "未使用";
}
